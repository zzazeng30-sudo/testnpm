// src/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
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
    // 'YYYY-MM-DD' 형식일 경우
    try {
        const date = new Date(dateString);
        return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    } catch (e) {
        return dateString;
    }
};

export default function DashboardPage() {
    const [summary, setSummary] = useState({
        totalPins: 0,
        todayPins: 0,
        totalCustomers: 0,
        todayCustomers: 0,
        totalContracts: 0,
    });
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        const today = getTodayDate();
        const startOfDay = today + 'T00:00:00.000Z'; // UTC 기준 오늘 0시
        // const now = new Date().toISOString(); // 현재 시간

        try {
            // 1. 총계 및 오늘 등록 현황 (Promise.all로 동시 조회)
            const [
                pins, customers, contracts,
                pinsToday, customersToday
            ] = await Promise.all([
                // 총 핀 수
                supabase.from('pins').select('id', { count: 'exact', head: true }),
                // 총 고객 수
                supabase.from('customers').select('id', { count: 'exact', head: true }),
                // 총 계약 건수
                supabase.from('contracts').select('id', { count: 'exact', head: true }),
                // 오늘 등록된 핀 수
                supabase.from('pins').select('id', { count: 'exact', head: true }).gte('created_at', startOfDay),
                // 오늘 등록된 고객 수
                supabase.from('customers').select('id', { count: 'exact', head: true }).gte('created_at', startOfDay),
            ]);

            // 2. 스케줄 (미래 잔금일)
            const { data: contractSchedule, error: scheduleError } = await supabase
                .from('contracts')
                .select('id, client_name, contract_price, property_memo, balance_date')
                // balance_date가 오늘 이후인 것만 필터링 (today는 YYYY-MM-DD)
                .gte('balance_date', today) 
                .order('balance_date', { ascending: true })
                .limit(10); // 최대 10건만 표시
            
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

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // 렌더링
    return (
        // MainLayout.module.css의 .pageContainer 스타일이 적용됩니다.
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
                </>
            )}
        </div>
    );
}