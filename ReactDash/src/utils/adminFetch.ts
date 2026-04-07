//This is an Admin-only fetch wrapper
///it attaches admin tokens, detects expired / invalid tokens
// forces logout on 401

export async function adminFetch(input:RequestInfo, init: RequestInit = {}) {
    const token = localStorage.getItem("admin_token")
    
    if(!token)
    {
        //admin not authenticated so clear stale auth state
        localStorage.removeItem("admin_token")
        localStorage.removeItem("admin_role")
        //must not be logged in so redirect
        window.location.href = "/#/admin-login"
        throw new Error("Admin not authenticated")
    }
    //for file upload etc
    const isFormData = init.body instanceof FormData

    //fetch with auth header
    const res = await fetch(input, {
        ...init,
        headers: {
            //saving any ehaders passed by caller
            ...(init.headers || {}),
            ...(isFormData ? {} : {"Content-Type": "application/json"}),
            Authorization: token,
        }
    })
    
    //401 returned when:
    ///- token expired
    ///- token revoked
    ///- token invalid / missing
    if(res.status === 401 || res.status === 403)
    {
        //clear stale auth state
        localStorage.removeItem("admin_token")
        localStorage.removeItem("admin_role")

        //redirect to login
        window.location.href = "/#/admin-login"

        throw new Error("admin seesion exppired")

    }
    return res
}