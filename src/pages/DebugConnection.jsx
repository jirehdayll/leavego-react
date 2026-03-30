import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { leaveRequestsAPI } from '../api/leaveRequests';

export default function DebugConnection() {
  const [logs, setLogs] = useState([]);
  const [session, setSession] = useState(null);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        addLog(`Session error: ${error.message}`);
      } else {
        addLog(`Session found: ${session?.user?.email}`);
        setSession(session);
      }
    } catch (err) {
      addLog(`Session check failed: ${err.message}`);
    }
  };

  const testSubmit = async () => {
    if (!session?.user) {
      addLog('No session - cannot test submit');
      return;
    }

    addLog('Testing form submission...');

    try {
      const testData = {
        user_id: session.user.id,
        user_email: session.user.email,
        user_name: 'Test User',
        request_type: 'Leave',
        department: 'Test Department',
        details: {
          first_name: 'Test',
          last_name: 'User',
          middle_name: 'Middle',
          position: 'Test Position',
          salary: 'Test Salary',
          leave_type: 'Vacation Leave',
          start_date: '2024-12-01',
          end_date: '2024-12-02',
          num_days: '2',
          date_of_filing: new Date().toISOString().split('T')[0],
          details_of_leave: 'Test details'
        }
      };

      addLog('Submitting test data...');
      const { data, error } = await leaveRequestsAPI.create(testData);

      if (error) {
        addLog(`Submit error: ${JSON.stringify(error)}`);
      } else {
        addLog(`Submit success: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      addLog(`Submit failed: ${err.message}`);
    }
  };

  const testFetch = async () => {
    addLog('Testing fetch...');
    
    try {
      const { data, error } = await leaveRequestsAPI.getAll();
      
      if (error) {
        addLog(`Fetch error: ${JSON.stringify(error)}`);
      } else {
        addLog(`Fetch success: Found ${data?.length || 0} requests`);
        data?.forEach((req, i) => {
          addLog(`  ${i+1}. ${req.user_name} - ${req.request_type} - ${req.status}`);
        });
      }
    } catch (err) {
      addLog(`Fetch failed: ${err.message}`);
    }
  };

  const testRealtime = () => {
    addLog('Setting up realtime subscription...');
    
    const channel = supabase
      .channel('test_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leave_requests' },
        (payload) => {
          addLog(`Real-time event: ${payload.eventType} - ${JSON.stringify(payload.new?.user_name)}`);
        }
      )
      .subscribe((status) => {
        addLog(`Subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
      addLog('Subscription cleaned up');
    };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Connection</h1>
      
      <div className="mb-4 space-x-2">
        <button onClick={checkSession} className="px-4 py-2 bg-blue-500 text-white rounded">Check Session</button>
        <button onClick={testSubmit} className="px-4 py-2 bg-green-500 text-white rounded">Test Submit</button>
        <button onClick={testFetch} className="px-4 py-2 bg-yellow-500 text-white rounded">Test Fetch</button>
        <button onClick={testRealtime} className="px-4 py-2 bg-purple-500 text-white rounded">Test Realtime</button>
      </div>

      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}
