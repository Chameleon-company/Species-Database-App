from flask import request, jsonify
import bcrypt
import os

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import secrets
from datetime import datetime, timedelta, timezone
from postgrest.exceptions import APIError

from rate_limit import FailedAttemptLimiter, too_many_attempts_message

"""
IMPORTANT AUTH NOTES!!

- Normal users: simple login, offline first, no tokens
- Admin users: online only, more secure using rokens

same users table used for both
"""

def require_role(supabase, allowed_roles):
    """
    authz helper
    assuming user has already logged in earlier
    """

    #user id from request header sent from frontend
    user_id = request.headers.get("auth-user-id")

    if user_id:
        try:
            user_id = int(user_id)
        except ValueError:
            return False, ("invalid user id", 401)
    
    #getting user from supabase
    resp =(
        supabase.table("users")
        .select("role", "is_active")
        .eq("user_id",user_id)
        .limit(1)
        .execute()
    )

    #if user non existent
    if not resp.data:
        return False, ("user not found", 401)
    
    user = resp.data[0]

    #admins able to disable accounts
    # check applies when device is online
    if not user["is_active"]:
        return False, ("account disabled", 403)
    
    if user["role"] not in allowed_roles:
        return False, ("no permissions" , 403)
    
    return True, None

def get_admin_user(supabase):
    """
    used by admin . admin must be online... token sent
    """

    token = request.headers.get("Authorization")

    if not token:
        return None, ("missing admin token", 401)

    # strip "Bearer " so we compare the raw token, not "Bearer <token>" can use this for testing with curl or postman
    if token.startswith("Bearer "):
        token = token.split(" ", 1)[1]

    sess_resp = (
        supabase.table("admin_sessions")
        .select("session_id, user_id, expires_at, revoked, revocation_reason, ip_address, user_agent")
        .eq("access_token", token)
        .execute()
    )

    if not sess_resp.data:
        return None, ("invalid token", 401)
    
    session = sess_resp.data[0]

    if session["revoked"]:
        if session.get("revocation_reason") == "new_login":
            return None, ("admin session has ended because this account logged in elsewhere", 401)
        return None, ("token revoked", 401)
    
    expires_at = datetime.fromisoformat(session["expires_at"])

    if datetime.now(timezone.utc) > expires_at:
        supabase.table("admin_sessions").update({"revoked": True, "revocation_reason": "expired"}).eq("access_token", token).execute()
        log_event(supabase, "expiry", session["user_id"], session["session_id"], session["ip_address"], session["user_agent"])
        handle_expired_admin_session(supabase, token, session["user_id"])
        return None, ("token expired", 401)
    
    #check that admin still exists
    user_resp = (
        supabase.table("users")
        .select("role, is_active")
        .eq("user_id", session["user_id"])
        .limit(1)
        .execute()
    )

    if not user_resp.data:
        return None,("admin user not found", 401)
    
    user = user_resp.data[0]
    
    if not user["is_active"]:
        return None, ("admin account disabled", 403)
    
    if user["role"] != "admin":
        return None, ("not admin acoount", 403)
    
    # Update last activity
    supabase.table("admin_sessions").update({"last_activity": datetime.now(timezone.utc).isoformat()}).eq("access_token", token).execute()
    
    return session["user_id"], None


def log_auth_event(supabase, user_id, event_type):
    try:
        supabase.table("analytics").insert({
            "user_id": user_id,
            "event_type": event_type,
            "login_time": datetime.now(timezone.utc).isoformat()
            }).execute()
    except Exception as e:
        print(f"Auth event logging failed: {e}")


def handle_expired_admin_session(supabase, token, user_id):
    log_auth_event(supabase, user_id, "SESSION_EXPIRED")
    (
        supabase.table("admin_sessions")
        .update({"revoked": True})
        .eq("access_token", token)
        .execute()
    )

#####TOKEN HELPERS (FOR ADMINS)
def generate_token():
    #generating a random string
    return secrets.token_urlsafe(32)

def access_expiry():
    return (datetime.now(timezone.utc) + timedelta(minutes=40)).isoformat()

def refresh_expiry():
    return (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

def hash_refresh_token(token):
    return bcrypt.hashpw(token.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def log_event(supabase, event_type, user_id, session_id=None, ip=None, ua=None, details=None):
    supabase.table("admin_session_audit").insert({
        "session_id": session_id,
        "user_id": user_id,
        "event_type": event_type,
        "ip_address": ip,
        "user_agent": ua,
        "details": details
    }).execute()

def create_admin_session(supabase, session_data):
    try:
        return supabase.table("admin_sessions").insert(session_data).execute()
    except APIError as exc:
        error = getattr(exc, "args", [{}])[0]
        if not isinstance(error, dict) or error.get("code") != "23505":
            raise
        if "admin_sessions_pkey" not in str(error.get("message", "")):
            raise

        latest = (
            supabase.table("admin_sessions")
            .select("session_id")
            .order("session_id", desc=True)
            .limit(1)
            .execute()
        )
        next_session_id = (latest.data[0]["session_id"] + 1) if latest.data else 1
        return supabase.table("admin_sessions").insert({
            **session_data,
            "session_id": next_session_id,
        }).execute()

def log_analytics(supabase, event_type, user_id, ip=None):
    supabase.table("analytics").insert({
        "user_id": user_id,
        "login_time": datetime.now(timezone.utc).isoformat(),
        "duration": 0,
        "location": ip,
        "event_type": event_type
    }).execute()

def revoke_existing_admin_sessions(supabase, user_id, ip=None, ua=None):
    # Task 5 Enforce single active admin session
    #Before a new admin session is created, revoke any existing active session for the same admin user
    existing_sessions = (
        supabase.table("admin_sessions")
        .select("session_id")
        .eq("user_id", user_id)
        .eq("revoked", False)
        .execute()
    )
    (
        supabase.table("admin_sessions")
        .update({
            "revoked": True,
            "revocation_reason": "new_login"
            })
        .eq("user_id", user_id)
        .eq("revoked", False)
        .execute()
    )
    for session in existing_sessions.data or []:
        log_event(
            supabase,
            "session_revoked_new_login",
            user_id,
            session.get("session_id"),
            ip,
            ua,
            "Session was revoked because this admin account was logged in elsewhere"
            )

#### SIGN-IN FAILURE HANDLING ####
# Every failed password check answers the same 401, whether the name is
# unknown, the password is wrong or the account is Google-only, so the
# response does not say which accounts exist. Disabled / not-admin answers
# only come after a correct password.
INVALID_CREDENTIALS = "invalid credentials"

# bcrypt hash (cost 12, same as bcrypt.gensalt()) of a random string nobody
# knows. Checked when there is no real hash, so an unknown name takes as long
# as a wrong password.
_DUMMY_PASSWORD_HASH = b"$2b$12$5lPbcyDdOkM020ytkt69ZuBL/6xTz0DOh3Wh5dEHfIFnpv9OsjF6y"

# bcrypt only uses the first 72 bytes, and bcrypt 5 refuses anything longer
BCRYPT_MAX_PASSWORD_BYTES = 72

# Failed attempts allowed inside the window before the API answers 429.
# Per name is the tight control; per IP is a loose backstop, because field
# staff can share one carrier or office IP. The per-IP block is only enforced
# once TRUSTED_PROXY_HOPS is set (app.py), except on admin-refresh.
LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60
LOGIN_FAILURE_LIMITS = {"name": 5, "ip": 30}


def _password_matches(password, stored_hash):
    """bcrypt check that never raises and always costs one bcrypt run."""
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > BCRYPT_MAX_PASSWORD_BYTES:
        return False
    if not stored_hash:
        bcrypt.checkpw(password_bytes, _DUMMY_PASSWORD_HASH)
        return False
    try:
        return bcrypt.checkpw(password_bytes, stored_hash.encode("utf-8"))
    except ValueError:
        # malformed hash in the users table
        return False


#### REGISTERING AUTH ROUTES ####
def register_auth_routes(app, supabase):
    """attaching routes to flask app"""

    limiter = FailedAttemptLimiter(LOGIN_FAILURE_LIMITS, LOGIN_FAILURE_WINDOW_SECONDS)
    app.extensions["auth_rate_limiter"] = limiter

    def record_failure(**values):
        limiter.record_failure(ip=request.remote_addr, **values)
        # access_route is the X-Forwarded-For chain; it shows whether
        # TRUSTED_PROXY_HOPS picks the real client address on this host
        app.logger.warning(
            "sign-in failed: path=%s ip=%s route=%s",
            request.path, request.remote_addr, request.access_route,
        )

    def ip_to_limit():
        # failures are always counted per IP, but the per-IP block is only
        # enforced once TRUSTED_PROXY_HOPS is set (app.py): until then
        # remote_addr may be a proxy address that every client shares
        return request.remote_addr if app.config.get("SIGN_IN_IP_LIMIT") else None

    def too_many_attempts(seconds):
        app.logger.warning(
            "sign-in rate limit hit: path=%s ip=%s route=%s",
            request.path, request.remote_addr, request.access_route,
        )
        resp = jsonify({"error": too_many_attempts_message(seconds)})
        resp.headers["Retry-After"] = str(seconds)
        return resp, 429

    @app.post("/api/auth/login")
    def login():
        """
        online login endpoint for pwa first tiem bootstrap (before switching to local PIN)
        and admin dashboard login (online only)
        Note: no token returns.... deliberate as the app is offline first
        """

        data = request.json
        if not data or not isinstance(data, dict):
            return jsonify({"error": "request body missing"}), 400
        name = data.get("name")
        password = data.get("password")

        if not name or not password or not isinstance(name, str) or not isinstance(password, str):
            return jsonify({"error": "name and password required"}), 400

        wait = limiter.blocked_for(ip=ip_to_limit(), name=name)
        if wait:
            return too_many_attempts(wait)

        #fecthing user from Supabase
        resp = (
            supabase.table("users")
            .select("user_id, password_hash, role, is_active")
            .eq("name", name)
            .limit(1)
            .execute()
        )

        user = resp.data[0] if resp.data else None

        #unknown name, Google-only account and wrong password all look the same
        if not _password_matches(password, user.get("password_hash") if user else None):
            record_failure(name=name)
            return jsonify({"error": INVALID_CREDENTIALS}), 401

        limiter.reset(name=name)

        #admin can disable users... applies when device is online
        if not user["is_active"]:
            return jsonify({"error": "account disabled"}), 403

        #succcessful login... client uses this for provisioning lcoal auth
        return jsonify({
            "user_id": user["user_id"],
            "role": user["role"],
        }), 200

    @app.get("/api/auth/user-state")
    def user_state():
        """
        used by the app whenever device is online. allows app to check:
            - was the user disabled?
            - was the role changed?
            - did the account version changed??
        avoids forcing periodic syncs but still allows backend to be synced whenever possible
        """

        user_id = request.args.get("user_id", type=int)
        ##client_version = request.args.get("account_version", type=int)

        if not user_id:
            return jsonify({"error": "user_id needed"}), 400
        
        resp = (
            supabase.table("users")
            .select("role, is_active")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

        if not resp.data:
            return jsonify({"error": "user not found"}), 404

        user = resp.data[0]

        #if changed is true, app shouldd refresh local role/status (once online)
        #changed = (user["account_version"] != client_version)

        return jsonify({
            "role": user["role"],
            "is_active": user["is_active"],
            #"account_version": user["account_version"],
            #client can decide if updating local state necessary
            #"changed": changed
        }), 200


    #-----------------
    # ADMIN LOGIN
    #-----------------
    @app.post("/api/auth/admin-login")
    def admin_login():
        """
        admin login using email and password for google
        short lived access token
        """

        data = request.json
        if not data or not isinstance(data, dict):
            return jsonify({"error": "missing request body"}), 400

        name = data.get("name")
        password = data.get("password")

        if not name or not password or not isinstance(name, str) or not isinstance(password, str):
            return jsonify({"error": "missing fields"}), 400

        wait = limiter.blocked_for(ip=ip_to_limit(), name=name)
        if wait:
            return too_many_attempts(wait)

        resp = (
            supabase.table("users")
            .select("user_id, password_hash, role, is_active")
            .eq("name", name)
            .execute()
        )

        user = resp.data[0] if resp.data else None

        #unknown name, Google-only account and wrong password all look the same;
        #role and disabled state are only revealed after a correct password
        if not _password_matches(password, user.get("password_hash") if user else None):
            record_failure(name=name)
            failed = jsonify({"error": INVALID_CREDENTIALS})
            if user:
                # audit only after the 401 is sent: an insert made only for
                # real names would make them slower to answer than unknown ones
                user_id, ip, ua = user["user_id"], request.remote_addr, request.headers.get("User-Agent")

                def audit_failed_login():
                    try:
                        log_event(supabase, "failed_login", user_id, ip=ip, ua=ua)
                    except Exception:
                        app.logger.exception("failed_login audit insert failed")

                failed.call_on_close(audit_failed_login)
            return failed, 401

        limiter.reset(name=name)

        if user["role"] != "admin":
            return jsonify({"error": "not an admin"}), 403

        if not user["is_active"]:
            return jsonify({"error": "account disabled"}), 403

        token = generate_token()
        refresh_token = generate_token()
        refresh_hash = hash_refresh_token(refresh_token)
        ip = request.remote_addr
        ua = request.headers.get("User-Agent")

        # Revoke existing admin session so only the newest login remains active
        revoke_existing_admin_sessions(supabase, user["user_id"], ip, ua)

        sess_resp = create_admin_session(supabase, {
            "user_id": user["user_id"],
            "access_token": token,
            "expires_at": access_expiry(),
            "revoked": False,
            "refresh_token_hash": refresh_hash,
            "refresh_expires_at": refresh_expiry(),
            "ip_address": ip,
            "user_agent": ua
        })

        session_id = sess_resp.data[0]["session_id"] if sess_resp.data else None

        log_event(supabase, "login", user["user_id"], session_id, ip, ua)
        log_analytics(supabase, "admin_login", user["user_id"], ip)
        log_auth_event(supabase, user["user_id"], "LOGIN")

        return jsonify({
            "access_token": token,
            "refresh_token": refresh_token,
            "expires_in": 2400
        }), 200
    
    @app.post("/api/auth/google-admin")
    def google_admin_login():
        """
        google login endpoitn for admin dashboard

        - google used to verify identity
        - roles and permissions in users table
        """

        # without a client id google-auth skips the audience check and would
        # accept a token minted for any Google app, so refuse to run at all
        client_id = (os.getenv("GOOGLE_CLIENT_ID") or "").strip()
        if not client_id:
            app.logger.error("GOOGLE_CLIENT_ID is not set; Google admin sign-in is disabled")
            return jsonify({"error": "google sign-in is not configured"}), 503

        # googlee id token from frontend side
        data = request.json
        if not data or not isinstance(data, dict) or "id_token" not in data:
            return jsonify({"error": "google id_token missing"}), 400

        wait = limiter.blocked_for(ip=ip_to_limit())
        if wait:
            return too_many_attempts(wait)

        #verifying token with google
        try:
            idinfo = id_token.verify_oauth2_token(
                data["id_token"],
                google_requests.Request(),
                client_id
            )
        except Exception:
            record_failure()
            return jsonify({"error": "invalid google token"}), 401

        # the users row is matched on the email, so Google must vouch for it
        if idinfo.get("email_verified") not in (True, "true"):
            record_failure()
            return jsonify({"error": "google account email is not verified"}), 401

        #pulling basic info from google response
        email = idinfo.get("email")

        resp = (
            supabase.table("users")
            .select("user_id, role, is_active")
            .eq("name", email)
            .limit(1)
            .execute()
        )

        if not resp.data:
            return jsonify({"error": "admin account not found"}), 403
        
        user = resp.data[0]

        if not user["is_active"]:
            return jsonify({"error": "account disabled"}), 403
        
        if user["role"] != "admin":
            return jsonify({"error": "not an admin account"}), 403
        
        token = generate_token()
        refresh_token = generate_token()
        refresh_hash = hash_refresh_token(refresh_token)
        ip = request.remote_addr
        ua = request.headers.get("User-Agent")

        # Revoke existing admin sessions so only the newest login remains active
        revoke_existing_admin_sessions(supabase, user["user_id"], ip, ua)


        sess_resp = create_admin_session(supabase, {
            "user_id": user["user_id"],
            "access_token": token,
            "expires_at": access_expiry(),
            "revoked": False,
            "refresh_token_hash": refresh_hash,
            "refresh_expires_at": refresh_expiry(),
            "ip_address": ip,
            "user_agent": ua
        })

        session_id = sess_resp.data[0]["session_id"] if sess_resp.data else None

        log_event(supabase, "login", user["user_id"], session_id, ip, ua)
        log_analytics(supabase, "admin_login", user["user_id"], ip)
        log_auth_event(supabase, user["user_id"], "LOGIN")

        return jsonify({
            "access_token": token,
            "refresh_token": refresh_token,
            "expires_in": 2400
        }), 200

    @app.post("/api/auth/admin-logout")
    def admin_logout():
        """
        admin logout endpoint
        - requires a valid admin token in the Authorization header
        - revokes the current admin session
        - prevents that token being used again
        """

        # Get the admin token from the Authorization header
        token = request.headers.get("Authorization")

        # If no token is provided reject the request
        if not token:
            return jsonify({"error": "missing admin token"}), 401

        # Strip "Bearer " prefix if present, so we compare the raw token
        if token.startswith("Bearer "):
            token = token.split(" ", 1)[1]

        # Check token is in admin_sessions table
        sess_resp = (
            supabase.table("admin_sessions")
            .select("session_id, user_id, revoked, revocation_reason, expires_at, ip_address, user_agent")
            .eq("access_token", token)
            .limit(1)
            .execute()
        )

        # If no matching session is found = token invalid
        if not sess_resp.data:
            return jsonify({"error": "invalid token"}), 401

        # Extract the first matching session row
        session = sess_resp.data[0]

        # Check if token is already revoked, if yes admin already logged out
        if session["revoked"]:
            if session.get("revocation_reason") == "new_login":
                return jsonify({
                    "error": "admin session has ended because this account logged in elsewhere",
                    "code": "ADMIN_SESSION_REVOKED_NEW_LOGIN"
                    }), 401
            return jsonify({"error": "session already revoked"}), 401

        # Check if token has expired
        expires_at = datetime.fromisoformat(session["expires_at"])
        #Compare current time (UTC) with expiry time
        if datetime.now(timezone.utc) > expires_at:
            handle_expired_admin_session(supabase, token, session["user_id"])
            return jsonify({"error": "token expired"}), 401

        ### Task 4
        log_auth_event(supabase, session["user_id"], "LOGOUT")

        # Revoke the session
        (
            supabase.table("admin_sessions")
            .update({"revoked": True, "revocation_reason": "logout"})
            .eq("access_token", token)
            .execute()
        )

        log_event(supabase, "logout", session["user_id"], session.get("session_id"), session.get("ip_address"), session.get("user_agent"))
        log_analytics(supabase, "admin_logout", session["user_id"], session.get("ip_address"))
        
        # Return success response to frontend
        return jsonify({
            "message": "admin logout successful"
            }), 200

    @app.post("/api/auth/admin-refresh")
    def admin_refresh():
        """
        Refresh admin access token using refresh token
        """

        data = request.json
        if not data or not isinstance(data, dict) or not isinstance(data.get("refresh_token"), str):
            return jsonify({"error": "refresh_token required"}), 400

        refresh_token = data["refresh_token"]

        # every wrong token costs one bcrypt check per open session below.
        # The per-IP block stays on here even before TRUSTED_PROXY_HOPS is
        # set: nothing calls this route today, and a blocked refresh only
        # means signing in again, which until then is not blocked per IP.
        wait = limiter.blocked_for(ip=request.remote_addr)
        if wait:
            return too_many_attempts(wait)

        # Find session with matching hash
        sess_resp = supabase.table("admin_sessions").select("session_id, user_id, refresh_token_hash, refresh_expires_at, revoked, ip_address, user_agent").eq("revoked", False).execute()

        session = None
        if len(refresh_token.encode("utf-8")) <= BCRYPT_MAX_PASSWORD_BYTES:
            for s in sess_resp.data:
                if s.get("refresh_token_hash") and bcrypt.checkpw(refresh_token.encode(), s["refresh_token_hash"].encode()):
                    session = s
                    break

        if not session:
            record_failure()
            return jsonify({"error": "invalid refresh token"}), 401

        if session["revoked"]:
            return jsonify({"error": "refresh token revoked"}), 401

        refresh_expires = datetime.fromisoformat(session["refresh_expires_at"])
        if datetime.now(timezone.utc) > refresh_expires:
            supabase.table("admin_sessions").update({"revoked": True, "revocation_reason": "refresh_expired"}).eq("session_id", session["session_id"]).execute()
            log_event(supabase, "refresh_expired", session["user_id"], session["session_id"], session["ip_address"], session["user_agent"])
            return jsonify({"error": "refresh token expired"}), 401

        # Generate new tokens
        new_access = generate_token()
        new_refresh = generate_token()
        new_refresh_hash = hash_refresh_token(new_refresh)
        new_refresh_expiry = refresh_expiry()

        supabase.table("admin_sessions").update({
            "access_token": new_access,
            "expires_at": access_expiry(),
            "refresh_token_hash": new_refresh_hash,
            "refresh_expires_at": new_refresh_expiry,
            "last_activity": datetime.now(timezone.utc).isoformat()
        }).eq("session_id", session["session_id"]).execute()

        log_event(supabase, "refresh", session["user_id"], session["session_id"], session["ip_address"], session["user_agent"])
        log_analytics(supabase, "admin_refresh", session["user_id"], session["ip_address"])

        return jsonify({
            "access_token": new_access,
            "refresh_token": new_refresh,
            "expires_in": 2400
        }), 200

    @app.get("/api/admin/session-audit")
    def admin_session_audit():
        """
        Get audit history for the current admin's sessions
        """

        user_id, err = get_admin_user(supabase)
        if err:
            return jsonify({"error": err[0]}), err[1]

        resp = supabase.table("admin_session_audit").select("*").eq("user_id", user_id).order("event_timestamp", desc=True).execute()

        return jsonify(resp.data), 200
