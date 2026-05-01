import { useCallback, useEffect, useState } from 'react';

const MIN_SCALE = 0.35;
const MAX_SCALE = 3;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function useCameraControls(viewportRef, worldWidth, worldHeight) {
    const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
    const [cursorWorld, setCursorWorld] = useState({ x: worldWidth / 2, y: worldHeight / 2 });

    const toWorld = useCallback((clientX, clientY, activeCamera = camera) => {
        if (!viewportRef.current) return { x: 0, y: 0 };
        const rect = viewportRef.current.getBoundingClientRect();
        return {
            x: (clientX - rect.left - activeCamera.x) / activeCamera.scale,
            y: (clientY - rect.top - activeCamera.y) / activeCamera.scale,
        };
    }, [camera, viewportRef]);

    const setCursorFromClient = useCallback((clientX, clientY) => {
        setCursorWorld(toWorld(clientX, clientY));
    }, [toWorld]);

    const fitToView = useCallback(() => {
        if (!viewportRef.current) return;
        const rect = viewportRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const scale = clamp(
            Math.min((rect.width - 48) / worldWidth, (rect.height - 48) / worldHeight),
            MIN_SCALE,
            MAX_SCALE
        );

        setCamera({
            scale,
            x: (rect.width - (worldWidth * scale)) / 2,
            y: (rect.height - (worldHeight * scale)) / 2,
        });
    }, [worldWidth, worldHeight, viewportRef]);

    const zoomAt = useCallback((nextScale, clientX, clientY) => {
        setCamera((prev) => {
            if (!viewportRef.current) return prev;
            const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
            const world = toWorld(clientX, clientY, prev);
            const rect = viewportRef.current.getBoundingClientRect();
            const lx = clientX - rect.left;
            const ly = clientY - rect.top;
            return {
                scale,
                x: lx - (world.x * scale),
                y: ly - (world.y * scale),
            };
        });
    }, [toWorld, viewportRef]);

    const zoomFromViewportCenter = useCallback((nextScale) => {
        if (!viewportRef.current) return;
        const rect = viewportRef.current.getBoundingClientRect();
        zoomAt(nextScale, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, [zoomAt, viewportRef]);

    useEffect(() => {
        fitToView();
    }, [fitToView]);

    return { camera, setCamera, cursorWorld, toWorld, setCursorFromClient, fitToView, zoomAt, zoomFromViewportCenter };
}
