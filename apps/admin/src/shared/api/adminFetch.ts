//This is an Admin-only fetch wrapper
///it attaches admin tokens, detects expired / invalid tokens
// forces logout on 401

import { clearAdminSession } from "./adminSession"

export async function adminFetch(input:RequestInfo, init: RequestInit = {}) {
    const token = localStorage.getItem("admin_token")
    
    if(!token)
    {
        //admin not authenticated so clear stale auth state
        clearAdminSession()
        //must not be logged in so redirect
        window.location.href = "/#/admin-login"
        throw new Error("Admin not authenticated")
    }
    //for file upload etc
    const isFormData = init.body instanceof FormData

    const headers = new Headers(init.headers)
    if (!isFormData) headers.set("Content-Type", "application/json")
    headers.set("Authorization", token)

    const res = await fetch(input, { ...init, headers })
    
    //401 returned when:
    ///- token expired
    ///- token revoked
    ///- token invalid / missing
    if(res.status === 401 || res.status === 403)
    {
        //clear stale auth state
        clearAdminSession()

        //redirect to login
        window.location.href = "/#/admin-login"

        throw new Error("admin seesion exppired")

    }
    return res
}