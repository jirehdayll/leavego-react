import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function SimpleTestForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        setMessage('❌ No session found');
        setLoading(false);
        return;
      }

      console.log('📝 Submitting with session:', session.user.email);

      // Create test request
      const testData = {
        user_id: session.user.id,
        user_email: session.user.email,
        user_name: 'Test User',
        request_type: 'Leave',
        department: 'Forest Management',
        details: {
          first_name: 'Test',
          last_name: 'User',
          middle_name: 'Middle',
          position: 'Forest Ranger',
          salary: '₱15,001-₱20,000',
          leave_type: 'Vacation Leave',
          start_date: '2024-12-01',
          end_date: '2024-12-02',
          num_days: '2',
          date_of_filing: new Date().toISOString().split('T')[0],
          details_of_leave: 'Test submission from simple form'
        }
      };

      console.log('📤 Submitting data:', testData);

      const { data, error } = await supabase
        .from('leave_requests')
        .insert([testData])
        .select();

      if (error) {
        console.error('❌ Submit error:', error);
        setMessage(`❌ Error: ${error.message}`);
      } else {
        console.log('✅ Submit success:', data);
        setMessage('✅ Form submitted successfully! Check admin dashboard.');
      }

    } catch (err) {
      console.error('❌ Submit failed:', err);
      setMessage(`❌ Failed: ${err.message}`);
    }

    setLoading(false);
  };

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.from('leave_requests').select('count');
      setMessage(error ? `❌ DB Error: ${error.message}` : `✅ DB Connected: ${data?.length || 0} records`);
    } catch (err) {
      setMessage(`❌ Connection failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple Test Form</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Test Leave Request</h3>
            <p className="text-sm text-gray-600">This will submit a test leave request to verify connection to admin dashboard.</p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:bg-blue-300"
          >
            {loading ? 'Submitting...' : 'Submit Test Request'}
          </button>
        </form>
        
        <button
          onClick={checkConnection}
          className="w-full bg-gray-500 text-white py-3 rounded-lg font-semibold mt-2"
        >
          Check Database Connection
        </button>
        
        {message && (
          <div className="mt-4 p-4 rounded-lg bg-gray-100">
            <pre className="text-sm">{message}</pre>
          </div>
        )}
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h4 className="font-semibold mb-2">Instructions:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Check Database Connection" first</li>
          <li>Then click "Submit Test Request"</li>
          <li>Check browser console for detailed logs</li>
          <li>Navigate to /admin/dashboard to see if request appears</li>
        </ol>
      </div>
    </div>
  );
}
