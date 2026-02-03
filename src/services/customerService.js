/**
 * [Revision Info]
 * Rev: 1.0
 * Date: 2026-01-08
 * Author: AI Assistant
 * * [Improvements]
 * 1. 고객 테이블(customers) 관련 쿼리 집합
 */
import { supabase } from '../0005_Lib/supabaseClient';

export const customerService = {
  // 고객 목록 조회
  getCustomers: async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // 고객 추가
  createCustomer: async (customerData) => {
    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select();
    return { data, error };
  },

  // 고객 삭제
  deleteCustomer: async (customerId) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    return { error };
  }
};