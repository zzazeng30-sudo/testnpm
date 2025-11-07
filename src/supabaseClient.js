import { createClient } from '@supabase/supabase-js'

// 1일차에 입력한 'Supabase 열쇠' 2개를 이 파일로 옮깁니다.
// (주의!) 이 값들은 실제 사장님의 값으로 교체하셔야 합니다.
const YOUR_SUPABASE_URL = 'https://dactzzcbtjbizdgsatev.supabase.co' // 사장님 Supabase URL
const YOUR_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhY3R6emNidGpiaXpkZ3NhdGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MDgyNTIsImV4cCI6MjA3Nzk4NDI1Mn0.voOxBqKHMVjje84g7SNqjI-gnl9viUUfizaen68Pf6k' // 사장님 Supabase Anon Key

// 'export'를 붙여서 모든 파일에서 이 '열쇠'를 가져다 쓸 수 있게 합니다.
export const supabase = createClient(YOUR_SUPABASE_URL, YOUR_SUPABASE_ANON_KEY)