import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye,  Upload, Clock, AlertTriangle,  FileText, Users, CheckCircle, Info, X, Circle, Space } from 'lucide-react';

import { supabase } from '../supabaseClient';
import './kyc.css';

const KYC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [companyInfo, setCompanyInfo] = useState(null);
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedRepresentative, setSelectedRepresentative] = useState(null);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const navigate = useNavigate();
  const [documentUploads, setDocumentUploads] = useState({
    passport: null,
    addressProof: null,
    utilityBill: null,
    drivingLicense: null
  });
  const [documentStatuses, setDocumentStatuses] = useState({
    passport: 'Not Uploaded',
    addressProof: 'Not Uploaded',
    utilityBill: 'Not Uploaded',
    drivingLicense: 'Not Uploaded'
  });
  const [allDocumentStatuses, setAllDocumentStatuses] = useState({});
  const [allDocumentUploads, setAllDocumentUploads] = useState({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploadType, setUploadType] = useState(null);
  const [complianceStats, setComplianceStats] = useState({
    verified: 0,
    pending: 0,
    incomplete: 0
  });
  const [kycRecords, setKycRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getDocumentTitle = (type) => {
    const titles = {
      passport: 'Passport',
      addressProof: 'Address Proof',
      utilityBill: 'Utility Bill',
      drivingLicense: 'Driving License'
    };
    return titles[type] || type;
  };

  const handleCancelUpload = () => {
    setShowConfirmation(false);
    setFileToUpload(null);
    setUploadType(null);
  };

  useEffect(() => {
    const subscription = supabase
      .channel('kyc-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kyc_documents'
        },
        (payload) => {
          console.log('Received real-time update from Supabase:', payload);
          const { new: newRecord } = payload;
          if (!newRecord) return;

          const { doc_type, status, representative_id,comments } = newRecord;
          
          let docType = doc_type;
          if (doc_type === 'passport') docType = 'passport';
          if (doc_type === 'address_proof') docType = 'addressProof';
          if (doc_type === 'utility_bill') docType = 'utilityBill';
          if (doc_type === 'driving_license') docType = 'drivingLicense';

          console.log(`Updating document status: ${docType} -> ${status}`);
          const normalizedStatus = status.toLowerCase();

          setAllDocumentStatuses((prev) => ({
          ...prev,
          [representative_id]: {
            ...(prev[representative_id] || {}),
            [docType]: normalizedStatus
          },
        }));

          if (selectedRepresentative && 
              (selectedRepresentative.email === representative_id || 
               selectedRepresentative.name === representative_id)) {
            console.log('Updating current view for selected representative');
            setDocumentStatuses(prev => {
              const updated = {
                ...prev,
                [docType]: normalizedStatus
              };
              console.log('Updated documentStatuses:', updated);
              return updated;
            });
          }
          if (
  selectedRepresentative &&
  (selectedRepresentative.email === representative_id ||
    selectedRepresentative.name === representative_id)
) {
  fetchRepresentativeDocuments(selectedRepresentative);
}

          if (normalizedStatus === 'approved') {
            setSuccessMessage(`${getDocumentTitle(docType)} has been approved!`);
          }
          if (normalizedStatus === 'rejected') {
          const message = comments 
            ? `${getDocumentTitle(docType)} was rejected. Reason: ${comments}. Please upload a new document within 24 hours.`
            : `${getDocumentTitle(docType)} was rejected. Please upload a new document within 24 hours.`;
          setError(message);
        }
        }
      )
      .subscribe();

    console.log('Real-time subscription set up for kyc_documents table');
    
    return () => {
      subscription.unsubscribe();
    };
  }, [selectedRepresentative]);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const user_id = sessionData.session.user.id;
          
          // Fetch company info
          const { data: companyData, error: companyError } = await supabase
            .from('company_info')
            .select('*')
            .eq('user_id', user_id)
            .single();

          if (companyError) {
            if (companyError.message.includes('JSON object requested') || 
                companyError.message.includes('multiple (or no) rows returned')) {
              // Redirect to company profile if no data exists
              setDirectors([]); // Clear directors
              setError('no_company_profile'); // Set specific error
              return;
            }
            throw companyError;
          }

          // Parse directors data
          let directorsData = [];
          if (companyData?.directors) {
            try {
              if (typeof companyData.directors === 'string') {
                directorsData = JSON.parse(companyData.directors);
              } else if (Array.isArray(companyData.directors)) {
                directorsData = companyData.directors;
              } else if (typeof companyData.directors === 'object') {
                directorsData = [companyData.directors];
              }
            } catch (e) {
              console.error('Error parsing directors:', e);
              directorsData = [];
            }
          }

          setDirectors(Array.isArray(directorsData) ? directorsData : []);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching company info:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyInfo();
  }, []);

  // Fetch document statuses for a representative
const fetchRepresentativeDocuments = async (representative) => {
  try {
    setUploadingDocuments(true);
    const representativeId = representative.email || representative.name;
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      throw new Error('No user session found');
    }
    
    const user_id = sessionData.session.user.id;

    // First, fetch document statuses from kyc_documents table
    const { data: documentData, error: documentError } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('user_id', user_id)
      .eq('representative_id', representativeId);

    if (documentError) {
      throw documentError;
    }

    console.log('Fetched document statuses:', documentData);

    // Initialize document statuses with default values
    const newDocumentStatuses = {
      passport: 'Not Uploaded',
      addressProof: 'Not Uploaded',
      utilityBill: 'Not Uploaded',
      drivingLicense: 'Not Uploaded'
    };

    const newDocumentUploads = {};

    // Update statuses from database records
    if (documentData) {
      documentData.forEach(doc => {
        // Map database doc_type to UI doc_type
        let docType = doc.doc_type;
        if (doc.doc_type === 'address_proof') docType = 'addressProof';
        if (doc.doc_type === 'utility_bill') docType = 'utilityBill';
        if (doc.doc_type === 'driving_license') docType = 'drivingLicense';

        // Update status
        newDocumentStatuses[docType] = doc.status.toLowerCase();
        if (doc.status.toLowerCase() === 'rejected' && doc.comments) {
          newDocumentStatuses[`${docType}RejectReason`] = doc.comments;
        }

        // Create document upload object
        newDocumentUploads[docType] = {
          name: doc.file_name,
          size: doc.file_size,
          path: doc.file_path,
          type: doc.content_type,
          uploadDate: doc.updated_at
        };
      });
    }

    console.log('Mapped document statuses:', newDocumentStatuses);
    
    // Update states
    setDocumentStatuses(newDocumentStatuses);
    setDocumentUploads(newDocumentUploads);
    
    // Cache the data
    setAllDocumentStatuses(prev => ({
      ...prev,
      [representativeId]: newDocumentStatuses
    }));
    
    setAllDocumentUploads(prev => ({
      ...prev,
      [representativeId]: newDocumentUploads
    }));

  } catch (error) {
    console.error('Error fetching representative documents:', error);
    setError(error.message);
  } finally {
    setUploadingDocuments(false);
  }
};
  const DocumentCard = ({ type, title, description, status, document, onUpload, onView }) => {
    const handleFileSelection = (e) => {
      const file = e.target.files[0];
      if (file) {
        setFileToUpload(file);
        setUploadType(type);
        setShowConfirmation(true);
        onUpload(e, type);
      }
    };
    const normalizedStatus = (status || 'not uploaded').toLowerCase();
    const rejectionReason = documentStatuses[`${type}RejectReason`];

    // Debug logging for document status
    console.log(`DocumentCard ${type} status:`,normalizedStatus);

    return (
      <div className="document-card1">
        <div className="document-header">
          <h4 className="document-title">{title}</h4>
          <div className={`document-status ${getStatusClass(normalizedStatus)}`}>
            {normalizedStatus=== 'approved' && (
              <><CheckCircle size={16} className="mr-1" /> <span>Approved</span></>
            )}
            {normalizedStatus === 'pending' && (
              <><Clock size={16} className="mr-1" /> <span>Pending</span></>
            )}
            {normalizedStatus === 'rejected' && (
              <><X size={16} className="mr-1" /> <span>Rejected</span></>
            )}
            {normalizedStatus === 'not Uploaded' && (
              <><Circle size={16} className="mr-1" /> <span>Required</span></>
            )}
          </div>
        </div>
              {normalizedStatus === 'rejected' && (
        <div className="bg-red-500/10 p-3 rounded-md mt-3 mb-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-red-400 text-sm font-medium">Document Rejected</p>
              {rejectionReason && (
                <p className="text-red-300 text-sm mt-1">Reason: {rejectionReason}</p>
              )}
              <p className="text-amber-400 text-sm mt-2">
                Please upload a new document within 24 hours to maintain compliance.
              </p>
            </div>
          </div>
        </div>
      )}
        
        {( !document || status === 'not Uploaded') ? (
          <div className="mt-4">
            <p className="text-gray-300 text-sm mb-4">{description}</p>
            <label className="w-full cursor-pointer">
              <div className="upload-container">
                <input 
                  type="file" 
                  style={{ display: 'none' }}
                  onChange={handleFileSelection}
                  accept=".jpg,.jpeg,.png,.pdf"
                />
                <div className="upload-button">
                  <Upload className="mb-2" size={20} />
                  <span>Choose File</span>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (max 5MB)</p>
                </div>
              </div>
            </label>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center mb-2">
              <FileText className="text-gray-400 mr-2" size={16} />
              <span className="text-gray-300 text-sm">{document.name}</span>
            </div>
            <div className="kyc-document-meta">
              <span>Uploaded: {new Date(document.uploadDate).toLocaleDateString()}</span>      
              <span>Size: {Math.round(document.size / 1024)} KB</span>
            </div>
            <button 
              onClick={() => onView(type)}
              className="kyc-document-actions"
            >
              <Eye size={16} className="mr-2" />
              View Document
            </button>
          </div>
        )}
      </div>
    );
  };
  useEffect(() => {
  console.log('Updated documentStatuses:', documentStatuses);
}, [documentStatuses]);

useEffect(() => {
  console.log('Updated allDocumentStatuses:', allDocumentStatuses);
}, [allDocumentStatuses]);

  // Handle representative selection
  const handleSelectRepresentative = (representative) => {
    setSelectedRepresentative(representative);
    fetchRepresentativeDocuments(representative);
  };

  // Handle file change
  const handleFileChange = (e, documentType) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentUploads(prev => ({
        ...prev,
        [documentType]: file
      }));
    }
  };

  // Handle viewing a document
  const handleViewDocument = async (documentType) => {
    if (!selectedRepresentative || !documentUploads[documentType]) return;
    
    try {
      const filePath = documentUploads[documentType].path;
      
      // Get the signed URL for the file
      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(filePath, 60); // URL valid for 60 seconds
      
      if (error) {
        throw error;
      }
      
      if (data?.signedUrl) {
        // Open the document in a new tab
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error(`Error viewing ${documentType}:`, err);
      setError(`Could not retrieve document: ${err.message}`);
    }
  };

  const updateCachedDocumentData = (representativeId, documentType, data) => {
    // Update document statuses cache
    setAllDocumentStatuses(prev => ({
      ...prev,
      [representativeId]: {
        ...(prev[representativeId] || {}),
        [documentType]: data.status
      }
    }));

    // Update document uploads cache
    setAllDocumentUploads(prev => ({
      ...prev,
      [representativeId]: {
        ...(prev[representativeId] || {}),
        [documentType]: data.document
      }
    }));
  };

  const calculateCompliancePercentage = (stats) => {
    const total = stats.verified + stats.pending + stats.incomplete;
    if (total === 0) return 0;
    return Math.round((stats.verified / total) * 100);
  };

  // Handle document upload
  const handleUploadDocument = async (documentType) => {
    if (!selectedRepresentative || !documentUploads[documentType]) return;
    
    try {
      setUploadingDocuments(true);
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        throw new Error('No user session found');
      }
      
      const user_id = sessionData.session.user.id;
      const representativeId = selectedRepresentative.email || selectedRepresentative.name;
      const file = documentUploads[documentType];
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `${user_id}/${representativeId}/${fileName}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      const { error: dbError } = await supabase
      .from('kyc_documents')
      .insert([{
        user_id: user_id,
        doc_type: documentType,
        file_name: fileName,
        file_path: filePath,
        status: 'Pending',
        updated_at: new Date().toISOString(),
        file_size: file.size,
        content_type: fileToUpload.type,
        representative_id: representativeId
      }]);
      if (dbError) throw dbError;
      // Get public URL for the file

      
      // Update document status in the UI
      setDocumentStatuses(prev => ({
        ...prev,
        [documentType]: 'Pending'
      }));
      
      // Update document uploads with the file info
      setDocumentUploads(prev => ({
        ...prev,
        [documentType]: {
          name: file.name,
          size: file.size,
          path: filePath,
          type: file.type,
          uploadDate: new Date().toISOString()
        }
      }));
      


       // Update cached data
    updateCachedDocumentData(representativeId, documentType, {
      status: 'Pending',
      document: {
        name: file.name,
        size: file.size,
        path: filePath,
        type: file.type,
        uploadDate: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error(`Error uploading ${documentType}:`, err);
    setError(err.message);
  } finally {
    setUploadingDocuments(false);
  }
};

    const getStatusClass = (status) => {
    // Convert status to lowercase for consistent comparison
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'approved':
        return 'status-approved';
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return 'status-required';
    }
  };

  // Add this useEffect to fetch compliance stats and KYC records
  useEffect(() => {
    const fetchComplianceAndRecords = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) return;

        const user_id = sessionData.session.user.id;

        // Fetch all documents for current user
        const { data: documents, error: docsError } = await supabase
          .from('kyc_documents')
          .select('*')
          .eq('user_id', user_id);

        if (docsError) throw docsError;

        // Get unique representative IDs
        const representativeIds = [...new Set(documents?.map(doc => doc.representative_id) || [])];

        // Calculate document counts by status
        const stats = {
          verified: 0,
          pending: 0,
          incomplete: 0
        };

        // Create a map to track document status for each representative
        const repStatusMap = {};

        // Initialize status for each representative
        representativeIds.forEach(repId => {
          repStatusMap[repId] = {
            approved: 0,
            pending: 0,
            rejected: 0,
            total: 0
          };
        });

        // Count documents by status for each representative
        documents?.forEach(doc => {
          const status = doc.status.toLowerCase();
          const repId = doc.representative_id;

          repStatusMap[repId].total++;
          
          if (status === 'approved') {
            stats.verified++;
            repStatusMap[repId].approved++;
          } else if (status === 'pending') {
            stats.pending++;
            repStatusMap[repId].pending++;
          } else if (status === 'rejected') {
            stats.incomplete++;
            repStatusMap[repId].rejected++;
          }
        });

        // Fetch representatives from company_info
        const { data: companyData, error: companyError } = await supabase
          .from('company_info')
          .select('directors')
          .eq('user_id', user_id)
          .single();

        if (companyError) throw companyError;

        let directors = [];
        if (companyData?.directors) {
          if (Array.isArray(companyData.directors)) {
            directors = companyData.directors;
          } else if (typeof companyData.directors === 'object') {
            directors = [companyData.directors];
          } else if (typeof companyData.directors === 'string') {
            try {
              directors = JSON.parse(companyData.directors);
            } catch (e) {
              console.error('Error parsing directors:', e);
            }
          }
        }

        // Calculate status for each representative
        const records = directors.map(director => {
          const repId = director.email || director.name;
          const repStats = repStatusMap[repId] || { approved: 0, pending: 0, rejected: 0, total: 0 };
          const requiredDocs = 4; // Total required documents per representative
          
          let status = 'Incomplete';
          if (repStats.total === requiredDocs) {
            if (repStats.approved === requiredDocs) {
              status = 'Verified';
            } else if (repStats.pending > 0) {
              status = 'Pending';
            }
          }

          // Calculate risk score based on document status
          

          return {
            name: director.fullName || director.name,
            type: "Individual",
            role: director.role || "Director",
            status: status,
            dateAdded: new Date().toLocaleDateString()
          };
        });

        // Update missing documents count
        const totalRequired = directors.length * 4; // 4 documents per representative
        const totalSubmitted = stats.verified + stats.pending + stats.incomplete;
        stats.incomplete += totalRequired - totalSubmitted;

        setComplianceStats(stats);
        setKycRecords(records);

      } catch (error) {
        console.error('Error fetching compliance stats and records:', error);
        setError(error.message);
      }
    };

    fetchComplianceAndRecords();
  }, []);

  // Add this function before the return statement
  const filteredRecords = kycRecords.filter(record => {
    const matchesSearch = record.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || record.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="app-container" style={{ backgroundColor: 'rgb(10, 8, 38)', color: 'white' }}>
   
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            
            <div>
              
              <h1 className="text-2xl font-bold mb-2"><Shield className="text-indigo-400" size={24} /> KYC Overview</h1>
              <p className="text-gray-400">Manage and monitor your Know Your Customer compliance status</p>
            </div>
          </div>
        
        </div>

        <div className="tab-container">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`tab-buttonkyc ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <Shield className="tab-buttonkyc-icon" size={16} />
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`tab-buttonkyc ${activeTab === 'documents' ? 'active' : ''}`}
          >
            <FileText className="tab-buttonkyc-icon" size={16} />
            Documents
          </button>
          <button 
            onClick={() => setActiveTab('representatives')}
            className={`tab-buttonkyc ${activeTab === 'representatives' ? 'active' : ''}`}
          >
            <Users className="tab-buttonkyc-icon" size={16} />
            Representatives
          </button>
          <button 
            onClick={() => setActiveTab('verification')}
            className={`tab-buttonkyc ${activeTab === 'verification' ? 'active' : ''}`}
          >
            <CheckCircle className="tab-buttonkyc-icon" size={16} />
            Verification
          </button>
        </div>

        
        {activeTab === 'documents' && (
          <div className="bg-indigo-800/50 p-6 rounded-lg shadow border border-indigo-700">
            <h2 className="text-xl font-semibold mb-6">Upload Documents</h2>
            
            <div className="bg-blue-500/20 p-4 rounded-lg mb-6 flex items-start gap-3">
             
              <div>
                <h3 className="font-semibold text-blue-400">Select a Representative</h3>
                <p className="text-gray-300 mt-1">Please select a representative to upload or view their documents.</p>
              </div>
            </div>
            
            <div className="mb-6">
              <select 
                className="w-full bg-indigo-900/50 border border-indigo-700 text-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedRepresentative ? (selectedRepresentative.email || selectedRepresentative.name) : ''}
                onChange={(e) => {
                  const selected = directors.find(d => (d.email || d.name) === e.target.value);
                  if (selected) {
                    handleSelectRepresentative(selected);
                  }
                }}
              >
                <option value="">Select a Representative</option>
                {directors.map((director, idx) => (
                  <option key={idx} value={director.email || director.name}>
                    {director.fullName || director.name}
                  </option>
                ))}
              </select>
            </div>

            {loading || uploadingDocuments ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : selectedRepresentative ? (
              <>
                <div className="bg-blue-500/20 p-4 rounded-lg mb-6 flex items-start gap-3">
                 
                  <div>
                    <h3 className="font-medium text-blue-400 mb-1">Document Requirements for {selectedRepresentative.fullName || selectedRepresentative.name}</h3>
                    <p className="text-gray-300 text-sm">Please ensure all documents are clear, valid, and not expired. Documents must be in JPG, PNG, or PDF format.</p>
                  </div>
                </div>
                

<div className="document-grid">
  <DocumentCard 
    type="passport"
    title="Passport"
    description="Upload a clear copy of your passport. All details must be visible."
    status={documentStatuses.passport}
    document={documentUploads.passport}
    onUpload={handleFileChange}
    onView={handleViewDocument}
  />
  <DocumentCard 
    type="addressProof"
    title="Address Proof"
    description="Upload a document proving your current residential address."
    status={documentStatuses.addressProof}
    document={documentUploads.addressProof}
    onUpload={handleFileChange}
    onView={handleViewDocument}
  />
  <DocumentCard 
    type="utilityBill"
    title="Utility Bill"
    description="Upload a recent utility bill (less than 3 months old)."
    status={documentStatuses.utilityBill}
    document={documentUploads.utilityBill}
    onUpload={handleFileChange}
    onView={handleViewDocument}
  />
  <DocumentCard 
    type="drivingLicense"
    title="Driving License"
    description="Upload a clear copy of your driving license (front and back)."
    status={documentStatuses.drivingLicense}
    document={documentUploads.drivingLicense}
    onUpload={handleFileChange}
    onView={handleViewDocument}
  />
</div>
              </>
            ) : null}
          </div>
        )}

        {/* Representatives tab */}
        {activeTab === 'representatives' && (
          <div className="bg-[#1a1b36] rounded-lg p-6 border border-[#2e2f50]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold text-white">Legal Representatives</h2>
            </div>

            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error === 'no_company_profile' ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#232448] rounded-lg">
                <Users size={48} className="text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">Company Profile Required</h3>
                <p className="text-gray-500 max-w-sm mb-6">
                  Please complete your company profile first. This will allow you to add and manage your legal representatives for KYC verification.
                </p>
                <button 
                  onClick={() => navigate('/generate-forms')}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Set Up Company Profile
                </button>
              </div>
            ) : directors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#232448] rounded-lg">
                <Users size={48} className="text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No Representatives Added</h3>
                <p className="text-gray-500 max-w-sm mb-6">
                  Add legal representatives to your company profile to proceed with KYC verification.
                </p>
                <button 
                  onClick={() => navigate('/generate-forms')}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Add Representatives
                </button>
              </div>
            ) : (
              <div className="kyc-table-container">
                <table className="reports-table">
                  <thead>
                    <tr className="border-b border-[#2e2f50]">
                      <th className="py-3 text-left text-sm font-medium text-gray-400">Full Name</th>
                      <th className="py-3 text-left text-sm font-medium text-gray-400">Role</th>
                      <th className="py-3 text-left text-sm font-medium text-gray-400">Email</th>
                      <th className="py-3 text-left text-sm font-medium text-gray-400">Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2e2f50]">
                    {directors.map((director, index) => (
                      <tr key={index} className="hover:bg-[#232448] transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#2e2f50] flex items-center justify-center">
                              <Users size={16} className="text-gray-400" />
                            </div>
                            <span className="text-white">{director.fullName || director.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-4 text-gray-300">{director.role || 'Director'}</td>
                        <td className="py-4 text-gray-300">{director.email || 'N/A'}</td>
                        <td className="py-4 text-gray-300">{director.phone || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Add other tab content here */}

        {activeTab === 'verification' && (
  <div className="verification-container">
    <h2 className="verification-title">Verification Process</h2>
    
    <div className="verification-steps">
      {/* Document Collection Step */}
      <div className="verification-step pending">
        <div className="step-icon">
          <div className="icon-circle">
            <Circle size={16} />
          </div>
        </div>
        <div className="step-content">
          <h3>Document Collection</h3>
          <p className="step-description">Submit all required KYC documents</p>
          <p className="step-date">Pending</p>
        </div>
      </div>

      {/* Initial Review Step */}
      <div className="verification-step pending">
        <div className="step-icon">
          <div className="icon-circle">
            <Circle size={16} />
          </div>
        </div>
        <div className="step-content">
          <h3>Initial Review</h3>
          <p className="step-description">First review of submitted documents</p>
          <p className="step-date">Pending</p>
        </div>
      </div>

      {/* Enhanced Due Diligence Step */}
      <div className="verification-step pending">
        <div className="step-icon">
          <div className="icon-circle">
            <Circle size={16} />
          </div>
        </div>
        <div className="step-content">
          <h3>Enhanced Due Diligence</h3>
          <p className="step-description">Additional checks for high-risk cases</p>
          <p className="step-date">Pending</p>
        </div>
      </div>

      {/* Final Approval Step */}
      <div className="verification-step pending">
        <div className="step-icon">
          <div className="icon-circle">
            <Circle size={16} />
          </div>
        </div>
        <div className="step-content">
          <h3>Final Approval</h3>
          <p className="step-description">Final verification and approval</p>
          <p className="step-date">Pending</p>
        </div>
      </div>
    </div>

    <div className="verification-info">
      <div className="circle-button">
      <Info size={24} />  
      </div>   
      <div>
        <h4>Verification in Progress</h4>
        <p>Your documents are currently under review. This process typically takes 3-5 business days.</p>
      </div>
    </div>
  </div>
)}
{activeTab === 'overview' && (
  <div className="overview-container">
    <div className="overview-grid">
      {/* KYC Compliance Status */}
      <div className="kyc-status-card">
        <h3 className="kyc-status-title">KYC Compliance Status</h3>
        
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-value verified">{complianceStats.verified}</div>
            <div className="stat-label">Verified</div>
          </div>
          <div className="stat-box">
            <div className="stat-value pending">{complianceStats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-box">
            <div className="stat-value incomplete">{complianceStats.incomplete}</div>
            <div className="stat-label">Incomplete</div>
          </div>
        </div>
        
        <div className="compliance-section">
          <div className="compliance-header">
            <span className="compliance-text">Overall Compliance</span>
            <span className="compliance-value">
              {calculateCompliancePercentage(complianceStats)}%
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-value"
              style={{ width: `${calculateCompliancePercentage(complianceStats)}%` }}
            ></div>
          </div>
        </div>
      </div>
        

      {/* KYC Records */}
         <div className="records-card">
        <div className="records-header">
          <h3 className="kyc-status-title">KYC Records</h3>
          {directors.length > 0 && (
            <div className="search-controls">
              <input 
                type="text" 
                placeholder="Search records..." 
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select 
                className="status-select" 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </div>
          )}
        </div>

        {error === 'no_company_profile' || directors.length === 0 ? (
          <div className="empty-state">
            <Users size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">Company Profile Required</h3>
            <p className="empty-state-text">
              Please complete your company profile and add representatives to start the KYC verification process.
            </p>
            <button 
              onClick={() => navigate('/generate-forms')}
              className="add-rep-button"
            >
              Set Up Company Profile
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="records-table">
              <thead>
                <tr className="border-b border-[#2e2f50]">
                  <th className="text-left py-3 text-sm font-medium text-gray-400">NAME</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">TYPE</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e2f50]">
                {filteredRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-[#232448] transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#2e2f50] flex items-center justify-center">
                          <Users size={16} className="text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{record.name}</div>
                          <div className="text-sm text-gray-400">{record.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-gray-300">{record.type}</div>
                      <div className="text-xs text-gray-500">Added: {record.dateAdded}</div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                        ${record.status === 'Verified' ? 'bg-green-500/10 text-green-400' :
                          record.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-red-500/10 text-red-400'}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
)}
      </div>

       {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-header">
              <h3>Confirm Upload</h3>
            </div>
            <div className="confirmation-content">
              <p>Are you sure you want to upload this file?</p>
              <div className="file-details">
                <span className="doc-icon">📄</span>
                <span className="file-name">{fileToUpload?.name}</span>
                <span className="file-size">({formatFileSize(fileToUpload?.size)})</span>
              </div>
              <p className="doc-type">Document type: <strong>{getDocumentTitle(uploadType)}</strong></p>
              <p className="confirmation-note">Note: This file will be submitted for verification and cannot be changed while under review.</p>
            </div>
            <div className="confirmation-actions">
              <button className="cancel-button" onClick={handleCancelUpload}>Cancel</button>
              <button 
                className="confirm-button" 
                onClick={() => {
                  handleUploadDocument(uploadType);
                  setShowConfirmation(false);
                }}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYC;
