// src/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
// ✅ (이렇게 수정하세요: 점 2개 + lib)
import { supabase } from "../../0005_Lib/supabaseClient";
import styles from './DashboardPage.module.css'; 

// 오늘 날짜를 YYYY-MM-DD 형식으로 가져오는 유틸리티
const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// 미래 날짜를 포맷하는 유틸리티
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    } catch (e) {
        return dateString;
    }
};

/* 18일차 (수정): '경영통계' 기능 추가 */
export default function DashboardPage({ session }) { // ★ session prop 받기
    const [summary, setSummary] = useState({
        totalPins: 0,
        todayPins: 0,
        totalCustomers: 0,
        todayCustomers: 0,
        totalContracts: 0,
    });
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    // ★ 18일차: 경영통계 state
    const [statsLoading, setStatsLoading] = useState(true);
    const [totalRevenue, setTotalRevenue] = useState(0); // 총매출
    const [employeeStats, setEmployeeStats] = useState([]); // 직원별 실적

    const fetchDashboardData = async () => {
        setLoading(true);
        const today = getTodayDate();
        const startOfDay = today + 'T00:00:00.000Z'; 

        try {
            // 1. 총계 및 오늘 등록 현황 (Promise.all로 동시 조회)
            const [
                pins, customers, contracts,
                pinsToday, customersToday
            ] = await Promise.all([
                supabase.from('pins').select('id', { count: 'exact', head: true }),
                supabase.from('customers').select('id', { count: 'exact', head: true }),
                supabase.from('contracts').select('id', { count: 'exact', head: true }),
                supabase.from('pins').select('id', { count: 'exact', head: true }).gte('created_at', startOfDay),
                supabase.from('customers').select('id', { count: 'exact', head: true }).gte('created_at', startOfDay),
            ]);

            // 2. 스케줄 (미래 잔금일)
            const { data: contractSchedule, error: scheduleError } = await supabase
                .from('contracts')
                .select('id, client_name, contract_price, property_memo, balance_date')
                .gte('balance_date', today) 
                .order('balance_date', { ascending: true })
                .limit(10); 
            
            if (scheduleError) throw scheduleError;

            setSummary({
                totalPins: pins.count || 0,
                todayPins: pinsToday.count || 0,
                totalCustomers: customers.count || 0,
                todayCustomers: customersToday.count || 0,
                totalContracts: contracts.count || 0,
            });
            setSchedule(contractSchedule || []);

        } catch (error) {
            console.error('대시보드 데이터 로드 오류:', error.message);
        } finally {
            setLoading(false);
        }
    };
    
    // ★ 18일차: 경영통계 데이터를 불러오는 별도 함수
    const fetchStatsData = async () => {
        if (!session) return;
        setStatsLoading(true);
        
        try {
            const { user } = session;

            // 1. 내 회사 ID(company_id) 가져오기
            const { data: myProfile, error: profileError } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();
            
            if (profileError) throw profileError;
            const companyId = myProfile.company_id;

            if (!companyId) {
                console.log('경영통계: 회사 ID가 없습니다.');
                setEmployeeStats([]);
                setTotalRevenue(0);
                return;
            }
            
            // 2. 회사 ID가 일치하는 모든 '직원' 목록 가져오기
            const { data: employees, error: employeesError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('company_id', companyId);
            
            if (employeesError) throw employeesError;

            // 3. '회사' 전체의 '모든' 데이터 가져오기 (Promise.all)
            const [
                { data: allPins, error: pinsError },
                { data: allCustomers, error: customersError },
                { data: allContracts, error: contractsError }
            ] = await Promise.all([
                supabase.from('pins').select('id, user_id').eq('company_id', companyId), // (참고: pins 테이블에 company_id가 있다면 RLS로 자동 처리됨)
                supabase.from('customers').select('id, user_id').eq('company_id', companyId),
                supabase.from('contracts').select('id, user_id, contract_price').eq('company_id', companyId),
                // (참고: 현재 RLS 정책은 user_id 기준이므로, company_id 필터가 작동하려면
                //  테이블에 company_id 컬럼이 있고, RLS 정책이 company_id를 허용해야 합니다.
                //  여기서는 user_id 기준으로만 계산하겠습니다.)
            ]);
            
            // 3-1. (수정) user_id 기준으로 다시 데이터 로드 (RLS 정책에 맞춤)
            const { data: allPins_user } = await supabase.from('pins').select('id, user_id');
            const { data: allCustomers_user } = await supabase.from('customers').select('id, user_id');
            const { data: allContracts_user } = await supabase.from('contracts').select('id, user_id, contract_price');


            // 4. 총매출 계산
            const total = (allContracts_user || []).reduce((sum, contract) => sum + (contract.contract_price || 0), 0);
            setTotalRevenue(total);

            // 5. 직원별 실적 집계 (JavaScript에서)
            const stats = employees.map(emp => {
                const pinsCount = (allPins_user || []).filter(p => p.user_id === emp.id).length;
                const customersCount = (allCustomers_user || []).filter(c => c.user_id === emp.id).length;
                const contractsCount = (allContracts_user || []).filter(co => co.user_id === emp.id).length;
                const revenue = (allContracts_user || [])
                    .filter(co => co.user_id === emp.id)
                    .reduce((sum, contract) => sum + (contract.contract_price || 0), 0);
                
                return {
                    ...emp,
                    pinsCount,
                    customersCount,
                    contractsCount,
                    revenue
                };
            });

            setEmployeeStats(stats);

        } catch (error) {
            console.error('경영통계 데이터 로드 오류:', error.message);
        } finally {
            setStatsLoading(false);
        }
    };


    useEffect(() => {
        fetchDashboardData();
        fetchStatsData();
    }, [session]); // session이 준비되면 통계 데이터도 로드

    // 렌더링
    return (
        <div className={styles.pageContainer}> 
            <h1 className={styles.pageTitle}>대시보드</h1>
            
            {loading && <p>데이터를 불러오는 중입니다...</p>}
            
            {!loading && (
                <>
                    {/* 1. 신규 현황 (요약 카드) */}
                    <div className={styles.summaryGrid}>
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>총 매물 (핀)</h3>
                            <p className={styles.cardValue}>{summary.totalPins}개</p>
                            <p className={styles.cardMeta}>오늘 신규: <span className={styles.highlight}>{summary.todayPins}</span>개</p>
                        </div>
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>총 고객 수</h3>
                            <p className={styles.cardValue}>{summary.totalCustomers}명</p>
                            <p className={styles.cardMeta}>오늘 신규: <span className={styles.highlight}>{summary.todayCustomers}</span>명</p>
                        </div>
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>총 계약 건수</h3>
                            <p className={styles.cardValue}>{summary.totalContracts}건</p>
                            <p className={styles.cardMeta}>잔금일이 등록된 계약만 스케줄표에 표시됩니다.</p>
                        </div>
                    </div>
                    
                    {/* 2. 스케줄표 (미래 잔금일) */}
                    <div className={styles.scheduleSection}>
                        <h2 className={styles.scheduleTitle}>💰 예정된 잔금일 (스케줄표)</h2>
                        {schedule.length === 0 ? (
                            <p className={styles.emptyText}>예정된 잔금일(오늘 이후) 계약이 없습니다.</p>
                        ) : (
                            <div className={styles.table}>
                                {/* 테이블 헤더 */}
                                <div className={styles.tableHeader}>
                                    <div className={styles.col1}>잔금일</div>
                                    <div className={styles.col2}>고객명</div>
                                    <div className={styles.col3}>계약 가격(만원)</div>
                                    <div className={styles.col4}>매물 요약</div>
                                </div>
                                {/* 테이블 바디 */}
                                {schedule.map(item => (
                                    <div key={item.id} className={styles.tableRow}>
                                        <div className={styles.col1}>{formatDate(item.balance_date)}</div>
                                        <div className={styles.col2}>{item.client_name}</div>
                                        <div className={styles.col3}>{item.contract_price.toLocaleString()}</div>
                                        <div className={styles.col4}>{item.property_memo || '-'}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* ★ 18일차: 3. 경영 통계 섹션 ★ */}
                    <div className={styles.statsSection}>
                        <h2 className={styles.statsTitle}>📈 경영 통계</h2>
                        {statsLoading ? (
                            <p>경영 통계 데이터를 불러오는 중입니다...</p>
                        ) : (
                            <>
                                {/* 총매출 카드 */}
                                <div className={styles.statsCard}>
                                    <h3 className={styles.cardTitle}>회사 총 매출 (계약 가격 합계)</h3>
                                    <p className={styles.cardValue}>
                                        {totalRevenue.toLocaleString()} 만원
                                    </p>
                                </div>
                                
                                {/* 직원별 실적 테이블 */}
                                <h3 className={styles.statsSubtitle}>직원별 실적 현황</h3>
                                <div className={styles.table}>
                                    <div className={styles.tableHeader}>
                                        <div className={styles.statsCol1}>직원명 (이메일)</div>
                                        <div className={styles.statsCol2}>매물 등록</div>
                                        <div className={styles.statsCol3}>고객 등록</div>
                                        <div className={styles.statsCol4}>계약 건수</div>
                                        <div className={styles.statsCol5}>담당 매출(만원)</div>
                                    </div>
                                    {employeeStats.map(emp => (
                                        <div key={emp.id} className={styles.tableRow}>
                                            <div className={styles.statsCol1}>
                                                {emp.full_name || '-'}
                                                <span className={styles.empEmail}>{emp.email}</span>
                                            </div>
                                            <div className={styles.statsCol2}>{emp.pinsCount}건</div>
                                            <div className={styles.statsCol3}>{emp.customersCount}명</div>
                                            <div className={styles.statsCol4}>{emp.contractsCount}건</div>
                                            <div className={styles.statsCol5}>{emp.revenue.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}