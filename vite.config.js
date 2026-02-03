import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/vworld': {
        target: 'https://api.vworld.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vworld/, ''),
        secure: false,
      },
      '/api/data-go': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/data-go/, ''),
        secure: false,
      },
      '/api/seumter': {
        target: 'https://www.eais.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/seumter/, ''),
        secure: false, // SSL 인증서 무시
        // ✅ [추가] 브라우저-프록시-서버 간 쿠키 전송 허용
        credentials: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // ✅ Origin/Referer 유지
            proxyReq.setHeader('Origin', 'https://www.eais.go.kr');
            proxyReq.setHeader('Referer', 'https://www.eais.go.kr/moct/awp/abb01/AWPABB01F13');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // ✅ 세움터 특화 헤더
            proxyReq.setHeader('untclsfcd', '1000');
          });

          // ✅ [추가] 서버로부터 온 리다이렉트 응답을 가로채서 로컬 주소로 변환하거나 쿠키 도메인 변경
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const sc = proxyRes.headers['set-cookie'];
            if (sc) {
              // 쿠키의 Domain 설정을 제거하여 localhost에서도 저장되도록 처리
              proxyRes.headers['set-cookie'] = sc.map(s => s.replace(/Domain=[^;]+;?/i, ''));
            }
          });
        }
      }
    }
  }
})