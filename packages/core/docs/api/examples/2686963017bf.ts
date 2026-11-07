import { BackdropBlur } from '@kurot/core';
import type { DisplayObjectContainer } from '@kurot/core';

export function insertBackdrop(layer: DisplayObjectContainer, width: number, height: number): BackdropBlur {
    const backdrop = new BackdropBlur({ width, height, blurX: 36, blurY: 36, quality: 1, resolution: 0.5 });
    layer.addChildAt(backdrop, 0);
    return backdrop;
}

export {};
