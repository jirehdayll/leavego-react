import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function FullWorkflowTest() {
  const [logs, setLogs] = useState([]);
  const [employeeSession, setEmployeeSession] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [testData, setTestData] = useState(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  // Step 1: Test Employee Login
  const testEmployeeLogin = async () => {
    addLog('👤 Testing employee login...', 'info');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'employee@denr.gov.ph',
        password: 'password123'
      });
      
      if (error) {
        addLog(`❌ Employee login failed: ${error.message}`, 'error');
      } else {
        addLog(`✅ Employee logged in: ${data.user?.email}`, 'success');
        setEmployeeSession(data.session);
      }
    } catch (err) {
      addLog(`❌ Employee login error: ${err.message}`, 'error');
    }
  };

  // Step 2: Test Admin Login
  const testAdminLogin = async () => {
    addLog('👔 Testing admin login...', 'info');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@denr.gov.ph',
        password: 'password123'
      });
      
      if (error) {
        addLog(`❌ Admin login failed: ${error.message}`, 'error');
      } else {
        addLog(`✅ Admin logged in: ${data.user?.email}`, 'success');
        setAdminSession(data.session);
      }
    } catch (err) {
      addLog(`❌ Admin login error: ${err.message}`, 'error');
    }
  };

  // Step 3: Submit Leave Form as Employee
  const submitLeaveForm = async () => {
    if (!employeeSession) {
      addLog('❌ No employee session - cannot submit', 'error');
      return;
    }

    addLog('📝 Submitting leave form as employee...', 'info');
    
    try {
      const formData = {
        user_id: employeeSession.user.id,
        user_email: employeeSession.user.email,
        user_name: 'Test Employee',
        request_type: 'Leave',
        department: 'Forest Management',
        details: {
          first_name: 'Test',
          last_name: 'Employee',
          middle_name: 'User',
          position: 'Forest Ranger',
          salary: '₱15,001-₱20,000',
          leave_type: 'Vacation Leave',
          start_date: '2024-12-01',
          end_date: '2024-12-02',
          num_days: '2',
          date_of_filing: new Date().toISOString().split('T')[0],
          details_of_leave: 'Test leave submission from workflow test'
        }
      };

      addLog(`📤 Submitting: ${formData.user_name} - ${formData.request_type}`, 'info');

      const { data, error } = await supabase
        .from('leave_requests')
        .insert([formData])
        .select();

      if (error) {
        addLog(`❌ Form submission failed: ${error.message}`, 'error');
        addLog(`Error details: ${JSON.stringify(error)}`, 'error');
      } else {
        addLog(`✅ Form submitted successfully! ID: ${data[0]?.id}`, 'success');
        setTestData(data[0]);
        
        // Step 4: Check if admin can see it
        setTimeout(() => checkAdminView(), 2000);
      }

    } catch (err) {
      addLog(`❌ Form submission error: ${err.message}`, 'error');
    }
  };

  // Step 4: Check Admin Dashboard View
  const checkAdminView = async () => {
    addLog('👔 Checking admin dashboard view...', 'info');
    
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'Pending')
        .order('submitted_at', { ascending: false });

      if (error) {
        addLog(`❌ Admin fetch failed: ${error.message}`, 'error');
      } else {
        addLog(`✅ Admin can see ${data?.length} pending requests`, 'success');
        
        // Check if our test request is visible
        const ourRequest = data?.find(req => req.id === testData?.id);
        if (ourRequest) {
          addLog(`✅ Test request visible to admin: ${ourRequest.user_name}`, 'success');
        } else {
          addLog(`❌ Test request NOT visible to admin!`, 'error');
          addLog(`Looking for ID: ${testData?.id}`, 'error');
          data?.forEach(req => {
            addLog(`  Found: ${req.id} - ${req.user_name}`, 'info');
          });
        }
      }
    } catch (err) {
      addLog(`❌ Admin view error: ${err.message}`, 'error');
    }
  };

  // Step 5: Test Real-time Updates
  const testRealtime = () => {
    addLog('📡 Testing real-time updates...', 'info');
    
    const channel = supabase
      .channel('workflow_test')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leave_requests' },
        (payload) => {
          addLog(`📡 Real-time insert received: ${payload.new?.user_name}`, 'success');
        }
      )
      .subscribe((status) => {
        addLog(`📡 Real-time status: ${status}`, status === 'SUBSCRIBED' ? 'success' : 'info');
      });

    return () => {
      supabase.removeChannel(channel);
      addLog('📡 Real-time cleaned up', 'info');
    };
  };

  // Full workflow test
  const runFullWorkflow = async () => {
    addLog('🚀 Starting full workflow test...', 'info');
    
    await testEmployeeLogin();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await submitLeaveForm();
    await new Promise(resolve => setTimeout(resolve, 3000);
    
    await testAdminLogin();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await checkAdminView();
    testRealtime();
    
    addLog('🏁 Full workflow test completed', 'success');
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔄 Full Workflow Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Employee Status</h2>
          <button onClick={testEmployeeLogin} className="w-full bg-blue-500 text-white py-2 rounded mb-2">
            Test Employee Login
          </button>
          {employeeSession && (
            <div className="p-3 bg-green-50 rounded text-sm">
              <p><strong>Email:</strong> {employeeSession.user.email}</p>
              <p><strong>ID:</strong> {employeeSession.user.id}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Admin Status</h2>
          <button onClick={testAdminLogin} className="w-full bg-purple-500 text-white py-2 rounded mb-2">
            Test Admin Login
          </button>
          {adminSession && (
            <div className="p-3 bg-purple-50 rounded text-sm">
              <p><strong>Email:</strong> {adminSession.user.email}</p>
              <p><strong>ID:</strong> {adminSession.user.id}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Actions</h2>
          <div className="space-y-2">
            <button onClick={submitLeaveForm} disabled={!employeeSession} 
                    className="w-full bg-green-500 text-white py-2 rounded disabled:bg-gray-300">
              Submit Leave Form
            </button>
            <button onClick={checkAdminView} className="w-full bg-yellow-500 text-white py-2 rounded">
              Check Admin View
            </button>
            <button onClick={runFullWorkflow} className="w-full bg-red-500 text-white py-2 rounded">
              Run Full Workflow
            </button>
            <button onClick={clearLogs} className="w-full bg-gray-500 text-white py-2 rounded">
              Clear Logs
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-black text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
        {logs.map((log, i) => (
          <div key={i} className={`mb-1 ${
            log.type === 'error' ? 'text-red-400' : 
            log.type === 'success' ? 'text-green-400' : 
            'text-green-400'
          }`}>
            <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
          </div>
        ))}
        {logs.length === 0 && <div className="text-gray-500">No logs yet...</div>}
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Workflow Steps:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Employee logs in and submits leave form</li>
          <li>Form is saved to database</li>
          <li>Admin logs in and checks dashboard</li>
          <li>Admin should see the pending request</li>
          <li>Real-time updates should notify admin</li>
        </ol>
      </div>
    </div>
  );
}
