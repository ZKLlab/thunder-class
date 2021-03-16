# Thunder Class

🌩 雷课堂 《计算机科学进展》课程演示内容

## 功能

实现多人在线音“视”频聊天，支持屏幕共享。

其中，“视频”聊天并非传统意义上的视像传播，而是借助人脸关键点检测技术加上一些算法转化为人头部的姿态数据，各客户端通过姿态数据渲染特定角度的 Live2D 形象。

## 技术

**前端：** Vue.js, Vuetify, Live2D, face-api.js (TensorFlow.js), TypeScript

**通信：** WebRTC, socket.io

**后端：** Python, Sanic, OpenCV, docker

## 相关

[ZKLlab/web-head-pose-estimation-demo](https://github.com/ZKLlab/web-head-pose-estimation-demo): 纯前端人脸关键点识别及头部姿态估计算法实现

将本项目头部姿态估计算法的实现通过 WebAssembly 转移到前端，单独展示通过摄像头转换为 Live2D 形象的功能。可用最新版 Chrome 浏览器在线体验。
