import type { ReactNode } from "react"
import {Navigate} from "react-router-dom"

//protecting admin only routes
export default function ProtectedAdmin({ children }: { children: ReactNode }) {
    const token = localStorage.getItem("admin_token")

    if(!token)
    {
        localStorage.removeItem("admin_token")
        localStorage.removeItem("admin_role")

        return <Navigate to="/admin-login" replace />
    }
    return <>{children}</>
}