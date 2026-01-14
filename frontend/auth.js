//helper for local reauth logic
export function needsReAuth(maxDays = 7) {
    //if we've never logged in on the device before, need user to login
    const lastAuth = localStorage.getItem("last_auth_time")
    if (!lastAuth) return true

    //compare current time with last successful online login
    //use days instead of sessions
    const now = Date.now()
    const maxAgeMs = maxDays*24*60*60*1000

    return now - Number(lastAuth) > maxAgeMs
}