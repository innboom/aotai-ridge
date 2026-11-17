# 写实美术素材

本次使用内置 imagegen 生成四张游戏概念素材，再压缩为 WebP。画面受秦岭高山地貌启发，不是实地拍摄照片，也不表示真实路线。人物、帐篷、草丛、积雪和雾气由 Canvas 绘制。

## 资源

| 文件（相对于仓库根目录） | 用途 |
| --- | --- |
| public/assets/meadow.webp | 鳌山草甸与晨光背景 |
| public/assets/stone.webp | 秦岭石海与云雾背景 |
| public/assets/snow.webp | 太白山冬季山脊背景 |
| public/assets/rock.webp | 近景岩壁和岩块纹理 |

最终素材全部保存在仓库的 public/assets/，不依赖外部图床或在线生成服务。原始生成图保留在本机 Codex 的 generated_images 目录；部署只需要本仓库中的 WebP。四张素材共约 1.27 MiB。

## 渲染方式

- 山景按画布比例铺满，并根据行进位置缓慢平移，不循环拼接。
- 岩壁裁切真实质感纹理，叠加裂隙、阴影、碎石和植被；近景使用离屏 Canvas 缓存。
- 角色使用小比例侧面人体轮廓，补充衣褶、背包、帽檐、鞋底和登山杖。
- 三关、跳跃物理、碰撞边界、存档键和操作方式保持兼容。

## 完整生成提示词

### meadow

```text
Use case: photorealistic-natural. Asset type: wide background panorama for a realistic 2D side-scrolling hiking game set in the Qinling Mountains, China. Generate a single cinematic natural landscape photograph-like image, 3:2 or wide landscape orientation, highest available detail. Scene: high-elevation Aoshan-inspired Qinling alpine meadow, layers of long broad weathered granite ridgelines with naturally irregular profiles, olive and russet autumn tussock grass, scrub and scattered angular boulders, thin morning mist filling distant valleys, some distant dark fir forest below the treeline. The mountains must look like real Qinling granite ranges, not pointed Swiss Alpine pyramids. Golden morning sunlight comes from upper right, clear pale blue sky with fine white cirrus occupies upper 35 percent, detailed gray weathered rocks and straw-colored meadow along the bottom 20 percent. Camera looks horizontally across layered ridges and a spacious valley, from a side-on ridge at approximately 3300m, natural atmospheric depth, realistic light scatter, soft directional shadows, restrained earth colors, photographic texture and tiny terrain details. Wide open composition suitable for a parallax background. No people, no tent, no paths leading toward the camera, no buildings, no text, no UI, no border, no watermark, no vector art, no low-poly surfaces, no paint strokes, no fantasy elements.
```

### stone

```text
Use case: photorealistic-natural. Asset type: realistic panoramic mountain background for chapter two of a side-scrolling Qinling hiking game. Single wide landscape image with extremely realistic photographic geological detail. Scene: Qinling main ridgeline stone sea, immense naturally weathered gray granite boulder fields, broad fractured rounded mountain crests, dark rock gullies, sparse dry grass and low hardy shrubs growing between stone slabs. This is a high-altitude Chinese granite mountain range, not giant pointed Alpine spires. Cloudy late afternoon, blue-gray cloud and soft rolling mist between the overlapping ridges, a gentle break in cloud lights the central rock ridgeline. Sky occupies upper 35 percent, multiple distant ridge layers across center, intricate rock talus along bottom. Wide horizontal camera view across a valley, grounded wilderness documentary photography, believable scale, ambient light, fine stone grain, muted natural slate, cool brown and gray tones. No people, structures, tent, road, text, UI, border, watermark, geometric low-poly look, vector illustration, unrealistic sheer vertical walls or glowing fantasy elements.
```

### snow

```text
Use case: photorealistic-natural. Asset type: wide landscape background for the final snowy chapter of a realistic side-scrolling hiking game inspired by Taibai Mountain in the Qinling range of China. Generate a single photographic high-altitude winter panorama: broad windswept granite summit ridges with layered rugged weathered stone and natural patchy snow coverage, snow drifts settled between dark granite boulders, frosty low shrubs, deep valleys dissolving in blue-gray haze. Not a generic Matterhorn or sharp symmetrical mountain, not triangular stylized peaks. Overcast winter dawn with a soft peach opening in the cloud near far right, pale blue-white sky occupies upper 38 percent, distant ridges in middle, more detailed snowy rock slopes across bottom. Side-on wide horizontal view across the ridges, realistic cold diffuse lighting, intricate crystalline snow textures on rough gray rock, credible atmosphere and scale, wilderness photography. No falling snow in front of the camera (the game adds particles), no humans, no animals, no tent, no architecture, no text, no UI, no border, no watermark, no vector/low-poly/illustration style.
```

### rock

```text
Use case: photorealistic-natural. A straight-on photographic surface texture for a realistic 2D hiking game's granite cliff faces. Fill the entire wide rectangular image edge-to-edge with real dense weathered Qinling gray-brown granite, broad compact irregular slabs, subtle horizontal layered joints and vertical natural cracks, rough crystalline grain, dark crevices, muted traces of olive lichen and a little dry grass in cracks. It must look like a continuous exposed natural rocky hillside viewed from the front, with believable flat-to-angular rock relief. Lighting soft diffused daylight from upper right. Neutral mid-value gray-brown natural colors, fine surface detail at all scales. No large geometric polygons, no stylization, no outlined stones or masonry wall, no separate round pebbles, no artificial tiling grid. No sky, no landscape behind, no people, no roads, no text, no frame. Consistent focus and illumination throughout, texture usable for clipping into side-view game terrain shapes.
```

