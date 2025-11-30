<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1VlbwSOkgqZtXkJDHE6L9XYG3Zei7zQfd

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
   
   # 프로젝트 제목: metro waker

## 📌 개요
매일 반복되는 출퇴근길 지하철에서 "혹시 못 내리면 어떡하지?"라는 불안감 때문에 쪽잠조차 편히 못 자는 사람들을 위해 기획했습니다. GPS 신호가 잡히지 않는 지하 환경에서도 공공데이터 API를 활용해 내 열차를 정확히 추적하고, 목적지 한 정거장 전에 확실하게 깨워주는 웹앱입니다.

## ⚙️ 주요 기능
- 호선 및 역 선택: 직관적인 UI로 1~9호선 및 출발/도착역 간편 설정

- 실시간 열차 매칭: 출발역에 진입하는 열차 리스트 중 내가 탈 열차 선택

- 실시간 위치 추적: 선택한 열차의 현재 위치 모니터링 및 잔여 정거장 표시

- 전역 하차 알림: 목적지 바로 전 역에서 출발 신호 감지 시 강력한 알람 실행

## 🛠 기술 스택
Language: JavaScript (React)

Styling: Tailwind CSS

Data: 서울 열린데이터 광장 (실시간 도착정보/위치정보 API)

Deployment: Vercel (또는 로컬 환경)

## 🚀 실행 방법
1. 
