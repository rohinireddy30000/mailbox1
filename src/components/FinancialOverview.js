import React, { useState, useEffect } from "react";
import { supabase } from "./SupabaseClient";
import "./Documents.css";

const dummyFinancialData = {
  cash_balance: 0,
  revenue: 0,
  expenses: 0,
  net_burn: 0
};

const FinancialOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [years, setYears] = useState(['2023', '2024', '2025']);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [financialData, setFinancialData] = useState(null);
  const [useDummyData, setUseDummyData] = useState(false);
  const [transactions, setTransactions] = useState([
    {
      id: 1,
      date: '2024-03-15',
      description: 'Client Payment - ABC Corp',
      type: 'income',
      amount: 5000,
      status: 'completed'
    },
    {
      id: 2,
      date: '2024-03-14',
      description: 'Office Rent Payment',
      type: 'expense',
      amount: 2000,
      status: 'completed'
    },
    {
      id: 3,
      date: '2024-03-13',
      description: 'Software License',
      type: 'expense',
      amount: 500,
      status: 'pending'
    }
  ]);

  // Document types
  const documentTypes = [
    { id: 'all', name: 'All Documents', icon: '📁' },
    { id: 'Balance Sheet', name: 'Balance Sheet', icon: '📊' },
    { id: 'Trial Balance', name: 'Trial Balance', icon: '📝' },
    { id: 'Profit & Loss Statement', name: 'Profit & Loss Statement', icon: '💰' },
    { id: 'Financial Statement', name: 'Financial Statement', icon: '📑' }
  ];

  useEffect(() => {
    getCurrentUser();
    fetchFinancialData();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchReports();
    }
  }, [userId, selectedYear, selectedDocType]);

  const getCurrentUser = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Not authenticated');
      setUserId(data.session.user.id);
    } catch (error) {
      console.error('Error getting current user:', error);
      setError('Failed to authenticate user');
      setLoading(false);
    }
  };

  const fetchFinancialData = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session) {
        console.error('No user logged in');
        setUseDummyData(true);
        setFinancialData(dummyFinancialData);
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;

      // Fetch the most recent financial data for the user
      const { data, error } = await supabase
        .from('financial_data')
        .select('cash_balance, revenue, expenses, net_burn')
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching financial data:', error);
        setUseDummyData(true);
        setFinancialData(dummyFinancialData);
      } else if (data) {
        setUseDummyData(false);
        setFinancialData(data);
      } else {
        // If no data exists, use dummy data
        setUseDummyData(true);
        setFinancialData(dummyFinancialData);
      }
    } catch (error) {
      console.error('Error in fetchFinancialData:', error);
      setUseDummyData(true);
      setFinancialData(dummyFinancialData);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, let's get all records to check if any exist
      const { data: allRecords, error: allRecordsError } = await supabase
        .from('table_reports')
        .select('*');
      
      if (allRecordsError) {
        // Handle error silently
      }

      // Query the table_reports table for reports belonging to the user
      let query = supabase
        .from('table_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters if set
      if (selectedYear !== 'all') {
        query = query.eq('year', selectedYear);
      }

      if (selectedDocType !== 'all') {
        query = query.eq('doc_type', selectedDocType);
      }

      const { data: documents, error: documentsError } = await query;
      
      if (documentsError) {
        throw documentsError;
      }

      // Get signed URLs for each document
      const docsWithUrls = await Promise.all(
        documents.map(async (doc) => {
          if (doc.file_path) {
            try {
              // Check if the file exists in storage
              const filePathParts = doc.file_path.split('/');
              const fileName = filePathParts.pop();
              const folderPath = filePathParts.join('/');

              // Try both 'reports' and 'report' buckets
              let fileExists = null;
              let fileCheckError = null;
              let bucket = 'reports';

              // First try 'reports' bucket
              const reportsCheck = await supabase
                .storage
                .from('reports')
                .list(folderPath, {
                  limit: 100,
                  search: fileName
                });
              
              fileExists = reportsCheck.data;
              fileCheckError = reportsCheck.error;

              // If not found, try 'report' bucket instead
              if (fileCheckError || !fileExists || fileExists.length === 0) {
                const reportCheck = await supabase
                  .storage
                  .from('report')
                  .list(folderPath, {
                    limit: 100,
                    search: fileName
                  });
                
                fileExists = reportCheck.data;
                fileCheckError = reportCheck.error;
                if (!fileCheckError && fileExists && fileExists.length > 0) {
                  bucket = 'report';
                }
              }

              // If file doesn't exist or there's an error, skip URL generation
              if (fileCheckError || !fileExists || fileExists.length === 0) {
                return {
                  ...doc,
                  signed_url: null
                };
              }

              // Get signed URL from the correct bucket
              const { data: urlData, error: urlError } = await supabase
                .storage
                .from(bucket)
                .createSignedUrl(doc.file_path, 3600);

              return {
                ...doc,
                signed_url: urlData?.signedUrl || null
              };
            } catch (error) {
              return {
                ...doc,
                signed_url: null
              };
            }
          }
          return {
            ...doc,
            signed_url: null
          };
        })
      );

      setReports(docsWithUrls);
    } catch (error) {
      setError('Failed to fetch your reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDocTypeIcon = (docType) => {
    const type = documentTypes.find(t => t.name === docType);
    return type ? type.icon : '📄';
  };

  const formatEuro = (amount) => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  };

  const renderOverview = () => (
    <div className="financial-overview-section">
      <div className="financial-summary">
        <div className="financial-card cash-balance">
          <div className="card-icon">💶</div>
          <div className="card-content">
            <h3>Cash Balance</h3>
            <p className="card-value">{formatEuro(financialData?.cash_balance || 0)}</p>
           
          </div>
        </div>
        <div className="financial-card revenue">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <h3>Revenue</h3>
            <p className="card-value">{formatEuro(financialData?.revenue || 0)}</p>
            
          </div>
        </div>
        <div className="financial-card expenses">
          <div className="card-icon">📉</div>
          <div className="card-content">
            <h3>Expenses</h3>
            <p className="card-value">{formatEuro(financialData?.expenses || 0)}</p>
           
          </div>
        </div>
        <div className="financial-card net-burn">
          <div className="card-icon">🔥</div>
          <div className="card-content">
            <h3>Net Burn</h3>
            <p className="card-value">{formatEuro(financialData?.net_burn || 0)}</p>
           
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="transactions-section">
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
       
      </table>
    </div>
  );

  const renderReports = () => (
    <>
      <div className="filters-section">
        <div className="year-selector">
          <div className="year-selector-label">Year:</div>
          <div className="year-dropdown">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="year-select"
            >
              <option value="all">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="category-selector">
          <div className="category-selector-label">Document Type:</div>
          <div className="category-buttons">
            {documentTypes.map((docType) => (
              <button
                key={docType.id}
                className={`category-button ${selectedDocType === docType.id ? 'active' : ''}`}
                onClick={() => setSelectedDocType(docType.id)}
              >
                <span className="category-icon">{docType.icon}</span>
                {docType.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your financial reports...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="no-documents">
          <p>No financial reports found matching your criteria.</p>
        </div>
      ) : (
        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Description</th>
                <th>Year</th>
                <th>File Name</th>
                <th>Uploaded On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <div className="doc-type">
                      <span className="doc-icon">{getDocTypeIcon(report.doc_type)}</span>
                      <span>{report.doc_type}</span>
                    </div>
                  </td>
                  <td>{report.description || 'No description provided'}</td>
                  <td>
                    <span className="year-badge">{report.year}</span>
                  </td>
                  <td>{report.file_name}</td>
                  <td>{new Date(report.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      {report.signed_url ? (
                        <a
                          href={report.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-button view-button"
                        >
                          View
                        </a>
                      ) : (
                        <button
                          className="action-button view-button disabled"
                          disabled
                          title="File not available for viewing"
                        >
                          Unavailable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h2>Financial Overview</h2>
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'reports' && renderReports()}
      </div>
    </div>
  );
};

export default FinancialOverview; 
