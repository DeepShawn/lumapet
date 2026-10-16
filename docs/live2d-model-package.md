# LumaPet Live2D 模型包约定（实验）

LumaPet 的模型槽位接受一个本地文件选择集合。最少需要一个 `.model3.json` 或 `.model.json`；推荐同时选择同目录中的 `.moc3`、纹理、动作、表情文件，以及 `manifest.json`、`LICENSE` 或 `NOTICE`。

`manifest.json` 可以附带：

```json
{
  "author": "作者名",
  "sourceUrl": "https://…",
  "license": "CC BY-NC-SA 4.0",
  "commercialUse": false,
  "attribution": "发布时需要显示的署名",
  "paramMap": {
    "head_turn_x": "ParamAngleX",
    "mouth_open": "ParamMouthOpenY"
  }
}
```

当前 Web 端会解析并保存清单摘要（模型名、Cubism 版本、纹理/动作/表情数量和许可元数据），模型文件不会上传。后续 Windows/Android 原生壳可以使用同一份清单，把真正的 Live2D runtime 与模型目录接入 `model_info`、`tap_event`、`live2d` 三类统一事件。

模型许可证与代码许可证分开处理。缺少许可证的模型只允许本地实验，不进入默认角色库；Cubism Core 也不能因为 `pixi-live2d-display` 是 MIT 就自动获得 MIT 授权。
