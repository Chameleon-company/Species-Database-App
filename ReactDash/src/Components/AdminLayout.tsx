import type { ReactNode } from "react";
import ProtectedAdmin from "./ProtectedAdmin";
import TheDrawer from "./drawer";

export default function AdminLayout({
    children,
}: {children: ReactNode}) {
    return (<ProtectedAdmin>
        <>
            <TheDrawer />
            {children}
        </>
    </ProtectedAdmin>)
}