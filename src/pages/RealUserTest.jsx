import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function RealUserTest() {
  const [logs, setLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    checkCurrentSession();
  }, []);

  const checkCurrentSession = async () => {
    addLog('🔍 Checking current session...', 'info');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog(`❌ Session error: ${error.message}`, 'error');
      } else if (session) {
        addLog(`✅ Current session: ${session.user.email}`, 'success');
        setCurrentUser(session.user);
      } else {
        addLog('ℹ️ No current session', 'info');
      }
    } catch (err) {
      addLog(`❌ Session check failed: ${err.message}`, 'error');
    }
  };

  const testWithCurrentSession = async () => {
    if (!currentUser) {
      addLog('❌ No current session - please login first', 'error');
      return;
    }

    addLog(`📝 Testing form submission as ${currentUser.email}...`, 'info');
    
    try {
      const formData = {
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.email?.split('@')[0] || 'Current User',
        request_type: 'Leave',
        department: 'Forest Management',
        details: {
          first_name: 'Real',
          last_name: 'User',
          middle_name: 'Test',
          position: 'Forest Ranger',
          salary: '₱15,001-₱20,000',
          leave_type: 'Vacation Leave',
          start_date: '2024-12-01',
          end_date: '2024-12-02',
          num_days: '2',
          date_of_filing: new Date().toISOString().split('T')[0],
          details_of_leave: 'Real user test submission'
        }
      };

      const { data, error } = await supabase
        .from('leave_requests')
        .insert([formData])
        .select();

      if (error) {
        addLog(`❌ Form submission failed: ${error.message}`, 'error');
      } else {
        addLog(`✅ Form submitted! ID: ${data[0]?.id}`, 'success');
        
        // Test if admin can see it
        setTimeout(() => checkAdminCanSee(), 2000);
      }

    } catch (err) {
      addLog(`❌ Form submission error: ${err.message}`, 'error');
    }
  };

  const checkAdminCanSee = async () => {
    addLog('👔 Checking if admin can see the request...', 'info');
    
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
        
        // Check if our recent submission is there
        const recentRequests = data?.filter(req => 
          req.user_email === currentUser?.email && 
          new Date(req.submitted_at) > new Date(Date.now() - 60000) // Last minute
        );
        
        if (recentRequests?.length > 0) {
          addLog(`✅ Recent request found: ${recentRequests[0]?.user_name}`, 'success');
        } else {
          addLog(`❌ Recent request NOT found in admin view`, 'error');
        }
      }
    } catch (err) {
      addLog(`❌ Admin view error: ${err.message}`, 'error');
    }
  };

  const testRealtime = () => {
    addLog('📡 Setting up real-time monitoring...', 'info');
    
    const channel = supabase
      .channel('real_user_test')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'leave_requests' },
        (payload) => {
          addLog(`📡 New request: ${payload.new?.user_name} - ${payload.new?.request_type}`, 'success');
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

  const clearLogs = () => setLogs([]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">👤 Real User Test</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Current Status</h2>
        
        <div className="mb-4">
          <button onClick={checkCurrentSession} className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
            Check Session
          </button>
          {currentUser && (
            <div className="mt-3 p-3 bg-green-50 rounded">
              <p><strong>Email:</strong> {currentUser.email}</p>
              <p><strong>ID:</strong> {currentUser.id}</p>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <button 
            onClick={testWithCurrentSession} 
            disabled={!currentUser}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300 mr-2"
          >
            Submit Test Form
          </button>
          <button onClick={checkAdminCanSee} className="bg-yellow-500 text-white px-4 py-2 rounded mr-2">
            Check Admin View
          </button>
          <button onClick={testRealtime} className="bg-purple-500 text-white px-4 py-2 rounded mr-2">
            Start Real-time
          </button>
          <button onClick={clearLogs} className="bg-gray-500 text-white px-4 py-2 rounded">
            Clear Logs
          </button>
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
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>First, login normally through the app (use existing credentials)</li>
          <li>Then come to this test page</li>
          <li>Click "Check Session" to verify you're logged in</li>
          <li>Click "Submit Test Form" to test submission</li>
          <li>Click "Check Admin View" to see if admin can see it</li>
          <li>Go to /admin/dashboard to verify manually</li>
        </ol>
      </div>
    </div>
  );
}
