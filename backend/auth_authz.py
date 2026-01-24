from flask import request, jsonify
import bcrypt
import os

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import secrets
from datetime import datetime, timedelta, timezone

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
        return None, ("missing admin toekn", 401)
    
    sess_resp = (
        supabase.table("admin_sessions")
        .select("user_id, expires_at, revoked")
        .eq("access_token", token)
        .execute()
    )

    if not sess_resp.data:
        return None, ("token nto valid", 401)
    
    session = sess_resp.data[0]

    if session["revoked"]:
        return None, ("token revoked", 401)
    
    expires_at = datetime.fromisoformat(session["expires_at"])

    if datetime.now(timezone.utc) > expires_at:
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
    
    return session["user_id"], None
    

#####TOKEN HELPERS (FOR ADMINS)
def generate_token():
    #generating a random string
    return secrets.token_urlsafe(32)

def access_expiry():
    return (datetime.now(timezone.utc) + timedelta(minutes=40)).isoformat()


#### REGISTERING AUTH ROUTES ####
def register_auth_routes(app, supabase):
    """attaching routes to flask app"""
    @app.post("/api/auth/login")
    def login():
        """
        online login endpoint for pwa first tiem bootstrap (before switching to local PIN)
        and admin dashboard login (online only)
        Note: no token returns.... deliberate as the app is offline first
        """

        data = request.json
        if not data:
            return jsonify({"error": "request body missing"}), 400
        name = data.get("name")
        password = data.get("password")

        if not name or not password:
            return jsonify({"error": "name and password required"}), 400
        
        #fecthing user from Supabase
        resp = (
            supabase.table("users")
            .select("user_id, password_hash, role, is_active")
            .eq("name", name)
            .limit(1)
            .execute()
        )

        #for user not found
        if not resp.data:
            return jsonify({"error": "invalid credentials"}), 401
        
        user = resp.data[0]

        if not user.get("password_hash"):
            return jsonify({
                "error": "This account doesnt support password login. Try using google."
            }), 401

        #admin can disable users... applies when device is online
        if not user["is_active"]:
            return jsonify({"error": "account disabled"}), 403
        
        #comparing inputted password with stored hash
        if not bcrypt.checkpw(
            password.encode("utf-8"),
            user["password_hash"].encode("utf-8")
        ):
            return jsonify({"error": "credentials invalid"}), 401
        
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
            return jsonify({"error": "user_id needed"})
        
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
        if not data:
            return jsonify({"error": "missing request body"}), 400
        
        name = data.get("name")
        password = data.get("password")

        if not name or not password:
            return jsonify({"error": "missing fields"}), 400
        
        resp = (
            supabase.table("users")
            .select("user_id, password_hash, role, is_active")
            .eq("name", name)
            .execute()
        )

        if not resp.data:
            return jsonify({"error": "invalid creds"}), 401

        user = resp.data[0]

        if user["role"] != "admin":
            return jsonify({"error": "not an admin"}), 403
        
        if not user["is_active"]:
            return jsonify({"error": "account disabled"}), 403
        
        #guard
        if not user.get("password_hash"):
            return jsonify({
                "error": "this account does not support password login. try using google"
            }), 401

        #comparing inputted password with stored hash
        if not bcrypt.checkpw(
            password.encode("utf-8"),
            user["password_hash"].encode("utf-8")
        ):
            return jsonify({"error": "credentials invalid"}), 401
        
        token = generate_token()

        supabase.table("admin_sessions").insert({
            "user_id": user["user_id"],
            "access_token": token,
            "expires_at": access_expiry(),
            "revoked": False
        }).execute()

        return jsonify({
            "access_token": token,
            "expires_in": 2400
        }), 200
    
    @app.post("/api/auth/google-admin")
    def google_admin_login():
        """
        google login endpoitn for admin dashboard

        - google used to verify identity
        - roles and permissions in users table
        """

        # googlee id token from frontend side
        data = request.json
        if not data or "id_token" not in data:
            return jsonify({"error": "google id_token missing"}), 400
        
        #verifying token with google
        try:
            idinfo = id_token.verify_oauth2_token(
                data["id_token"],
                google_requests.Request(),
                os.getenv("GOOGLE_CLIENT_ID")
            )
        except Exception:
            return jsonify({"error": "invalid google token"}), 401
        
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

        supabase.table("admin_sessions").insert({
            "user_id": user["user_id"],
            "access_token": token,
            "expires_at": access_expiry(),
            "revoked": False
        }).execute()

        return jsonify({
            "access_token": token,
            "expires_in": 2400
        }), 200