import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LiveTestForm() {
  const [logs, setLogs] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    addLog('🔍 Checking session...');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addLog(`❌ Session error: ${error.message}`, 'error');
      } else if (session) {
        addLog(`✅ Session found: ${session.user.email}`, 'success');
        setSession(session);
      } else {
        addLog('❌ No session found', 'error');
      }
    } catch (err) {
      addLog(`❌ Session check failed: ${err.message}`, 'error');
    }
  };

  const testDirectSubmit = async () => {
    if (!session) {
      addLog('❌ No session - cannot submit', 'error');
      return;
    }

    setLoading(true);
    addLog('📝 Testing direct submission...', 'info');

    try {
      const testData = {
        user_id: session.user.id,
        user_email: session.user.email,
        user_name: 'Live Test User',
        request_type: 'Leave',
        department: 'Forest Management',
        details: {
          first_name: 'Live',
          last_name: 'Test',
          middle_name: 'User',
          position: 'Forest Ranger',
          salary: '₱15,001-₱20,000',
          leave_type: 'Vacation Leave',
          start_date: '2024-12-01',
          end_date: '2024-12-02',
          num_days: '2',
          date_of_filing: new Date().toISOString().split('T')[0],
          details_of_leave: 'Live test submission'
        }
      };

      addLog(`📤 Submitting data for ${session.user.email}...`, 'info');

      const { data, error } = await supabase
        .from('leave_requests')
        .insert([testData])
        .select();

      if (error) {
        addLog(`❌ Submit error: ${error.message}`, 'error');
        addLog(`Error details: ${JSON.stringify(error)}`, 'error');
      } else {
        addLog(`✅ Submit successful! ID: ${data[0]?.id}`, 'success');
        addLog(`📊 Record: ${data[0]?.user_name} - ${data[0]?.request_type}`, 'success');
        
        // Test fetching it back
        setTimeout(() => testFetch(), 1000);
      }

    } catch (err) {
      addLog(`❌ Submit failed: ${err.message}`, 'error');
    }

    setLoading(false);
  };

  const testFetch = async () => {
    addLog('📖 Testing fetch...', 'info');
    
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_email', session?.user.email)
        .order('submitted_at', { ascending: false });

      if (error) {
        addLog(`❌ Fetch error: ${error.message}`, 'error');
      } else {
        addLog(`✅ Fetch successful: ${data?.length} records`, 'success');
        data?.forEach((record, i) => {
          addLog(`  ${i+1}. ${record.user_name} - ${record.request_type} - ${record.status}`, 'info');
        });
      }
    } catch (err) {
      addLog(`❌ Fetch failed: ${err.message}`, 'error');
    }
  };

  const testRealtime = () => {
    addLog('📡 Setting up realtime subscription...', 'info');
    
    const channel = supabase
      .channel('live_test')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leave_requests' },
        (payload) => {
          addLog(`📡 Real-time event: ${payload.eventType} - ${payload.new?.user_name || payload.old?.user_name}`, 'success');
        }
      )
      .subscribe((status) => {
        addLog(`📡 Subscription status: ${status}`, status === 'SUBSCRIBED' ? 'success' : 'info');
      });

    return () => {
      supabase.removeChannel(channel);
      addLog('📡 Subscription cleaned up', 'info');
    };
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔴 Live Test Form</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Session Status</h2>
          <button onClick={checkSession} className="w-full bg-blue-500 text-white py-2 rounded">
            Check Session
          </button>
          {session && (
            <div className="mt-3 p-3 bg-green-50 rounded">
              <p className="text-sm"><strong>Email:</strong> {session.user.email}</p>
              <p className="text-sm"><strong>ID:</strong> {session.user.id}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Actions</h2>
          <div className="space-y-2">
            <button onClick={testDirectSubmit} disabled={loading || !session} 
                    className="w-full bg-green-500 text-white py-2 rounded disabled:bg-gray-300">
              {loading ? 'Submitting...' : 'Submit Test Request'}
            </button>
            <button onClick={testFetch} className="w-full bg-yellow-500 text-white py-2 rounded">
              Fetch My Requests
            </button>
            <button onClick={testRealtime} className="w-full bg-purple-500 text-white py-2 rounded">
              Start Real-time
            </button>
            <button onClick={clearLogs} className="w-full bg-red-500 text-white py-2 rounded">
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
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Check Session" to verify login</li>
          <li>Click "Submit Test Request" to test form submission</li>
          <li>Check browser console for additional logs</li>
          <li>Go to /admin/dashboard to see if request appears</li>
        </ol>
      </div>
    </div>
  );
}
