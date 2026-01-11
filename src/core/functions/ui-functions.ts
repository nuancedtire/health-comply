import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const getUiSettingsFn = createServerFn({ method: "GET" })
    .handler(async () => {
        const request = getRequest();
        const cookieHeader = request?.headers.get("cookie") || "";

        // Manual parsing to avoid external dependency
        const getCookie = (name: string) => {
            const match = cookieHeader.match(new RegExp('(^| )' + name + '=([^;]+)'));
            if (match) return match[2];
            return null;
        };

        const sidebarState = getCookie("sidebar_state");

        // Sidebar defaults to true in the UI, so we default to true here unless explicitly 'false'
        let isOpen = true;
        if (sidebarState === "false") {
            isOpen = false;
        }

        return {
            sidebarOpen: isOpen
        };
    });

