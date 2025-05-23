import React, { useState } from 'react';
import './Mailbox.css'; // Create this for custom styles if needed
import { FaShippingFast } from 'react-icons/fa';

const mockMail = [
  {
    id: 1,
    sender: "Dutch Tax Authority",
    subject: "Annual Tax Assessment 2023",
    tags: ["Important"],
    date: "10/15/2023",
    status: "New",
    analyzed: false,
    official: true,
  },
  {
    id: 2,
    sender: "Chamber of Commerce",
    subject: "Company Registration Update",
    tags: ["AI Analyzed"],
    date: "10/14/2023",
    status: "Scanned",
    analyzed: true,
    official: true,
  },
  {
    id: 3,
    sender: "ABN AMRO Bank",
    subject: "Important: Account Statement",
    tags: [],
    date: "10/13/2023",
    status: "Forwarded",
    analyzed: false,
    official: false,
  },
];

const mockShipments = [
  {
    id: 1,
    recipient: 'John Doe',
    address: '123 Main St, Amsterdam, NL',
    type: 'Letter',
    contents: 'Legal documents',
    deliveryMethod: 'Standard',
    tracking: true,
    deliveryConfirmation: false,
    insurance: false,
    scheduledDate: '2024-06-10',
    status: 'Shipped',
  },
  {
    id: 2,
    recipient: 'Acme Corp',
    address: '456 Business Rd, Rotterdam, NL',
    type: 'Parcel',
    contents: 'Company registration kit',
    deliveryMethod: 'Express',
    tracking: true,
    deliveryConfirmation: true,
    insurance: true,
    scheduledDate: '2024-06-12',
    status: 'In Transit',
  },
  {
    id: 3,
    recipient: 'Jane Smith',
    address: '789 Market Ave, Utrecht, NL',
    type: 'Document',
    contents: 'Signed agreement',
    deliveryMethod: 'Same Day',
    tracking: false,
    deliveryConfirmation: true,
    insurance: false,
    scheduledDate: '2024-06-09',
    status: 'Delivered',
  },
];

const Mailbox = () => {
  const [activeTab, setActiveTab] = useState('incoming');
  // Prepare Shipment form state
  const [shipmentType, setShipmentType] = useState('Letter');
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [shipmentContents, setShipmentContents] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('Standard');
  const [tracking, setTracking] = useState(false);
  const [deliveryConfirmation, setDeliveryConfirmation] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  const handleCreateShipment = (e) => {
    e.preventDefault();
    // For now, just clear the form or show an alert
    alert('Shipment created!');
  };

  return (
    <div className="mailbox-container">
      <h1>Mailbox</h1>
      <p>Manage your physical and digital mail</p>
      <div className="mailbox-actions">
        <button className={activeTab === 'incoming' ? 'active' : ''} onClick={() => setActiveTab('incoming')}>Incoming Mail</button>
        <button className={activeTab === 'services' ? 'active' : ''} onClick={() => setActiveTab('services')}>Mailbox Services</button>
        <button className={activeTab === 'shipment' ? 'active' : ''} onClick={() => setActiveTab('shipment')}>Prepare Shipment</button>
        <button className={activeTab === 'shipments' ? 'active' : ''} onClick={() => setActiveTab('shipments')}>Shipments</button>
      </div>
      {activeTab === 'incoming' && (
        <>
          <div className="mailbox-toolbar">
            <input placeholder="Search mail..." />
            <button>AI Analysis</button>
            <button>Filter</button>
            <button>Scan All</button>
            <button>Forward All</button>
          </div>
          <div className="mailbox-list">
            <div className="mailbox-list-header">
              <span>Mail Details</span>
              <span>Received</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {mockMail.map(mail => (
              <div className="mailbox-list-item" key={mail.id}>
                <span>
                  <strong>{mail.sender}</strong>
                  {mail.tags.map(tag => (
                    <span className={`mail-tag ${tag === "Important" ? "important" : ""}`} key={tag}>{tag}</span>
                  ))}
                  <div>{mail.subject}</div>
                  {mail.official && <div className="mail-official">Official Document</div>}
                </span>
                <span>{mail.date}</span>
                <span className={`mail-status ${mail.status.toLowerCase()}`}>{mail.status}</span>
                <span>
                  <button title="AI Analysis">🤖</button>
                  <button title="Forward">➡️</button>
                  <button title="View">👁️</button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {activeTab === 'services' && (
        <div className="mailbox-services-cards" style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
          {/* Mail Forwarding Card */}
          <div className="mailbox-service-card">
            <div className="service-icon">📩</div>
            <h2>Mail Forwarding</h2>
            <p>Have your mail automatically forwarded to your preferred address or digitally scanned and sent to your email.</p>
            <div>Auto-forwarding: <span style={{ color: 'limegreen' }}>Active</span></div>
            <div>Next scheduled: <b>Daily at 4:00 PM</b></div>
            <button className="service-action">Configure Forwarding</button>
          </div>
          {/* Mail Scanning Card */}
          <div className="mailbox-service-card">
            <div className="service-icon">📠</div>
            <h2>Mail Scanning</h2>
            <p>We scan your mail and make it available in your digital mailbox, with secure storage and OCR text recognition.</p>
            <div>Auto-scanning: <span style={{ color: 'limegreen' }}>Active</span></div>
            <div>Storage: <b>12 months</b></div>
            <button className="service-action">Configure Scanning</button>
          </div>
          {/* AI Document Analysis Card */}
          <div className="mailbox-service-card">
            <div className="service-icon">💡</div>
            <h2>AI Document Analysis</h2>
            <p>Our AI system automatically identifies document types, extracts key information, and provides actionable insights.</p>
            <div>Auto-analysis: <span style={{ color: 'limegreen' }}>Active</span></div>
            <div>Language support: <b>Dutch, English</b></div>
            <button className="service-action">Upload Document for Analysis</button>
          </div>
        </div>
      )}
      {activeTab === 'shipment' && (
        <form className="prepare-shipment-form" onSubmit={handleCreateShipment} style={{marginTop: '2rem'}}>
          <h2 style={{marginBottom: 0}}>Prepare Shipment</h2>
          <p style={{marginTop: 0}}>Create and manage outgoing shipments. We'll handle the packaging, postage, and delivery.</p>
          <div className="shipment-form-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', background: 'rgba(30, 20, 60, 0.5)', padding: '2rem', borderRadius: '20px', marginTop: '2rem'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              <div>
                <label style={{fontWeight: 500}}>Shipment Type</label>
                <select value={shipmentType} onChange={e => setShipmentType(e.target.value)} style={{width: '100%', fontWeight: 600, fontSize: '1.1rem'}}>
                  <option value="Letter">Letter</option>
                  <option value="Parcel">Parcel</option>
                  <option value="Document">Document</option>
                </select>
              </div>
              <div>
                <label style={{fontWeight: 500}}>Recipient</label>
                <input
                  type="text"
                  placeholder="Recipient name"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  style={{width: '100%', marginBottom: '1rem'}}
                />
                <textarea
                  placeholder="Recipient address"
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                  rows={2}
                  style={{width: '100%'}}
                />
              </div>
              <div>
                <label style={{fontWeight: 500}}>Delivery Method</label>
                <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)} style={{width: '100%', fontWeight: 600, fontSize: '1.1rem'}}>
                  <option value="Standard">Standard</option>
                  <option value="Express">Express</option>
                  <option value="Same Day">Same Day</option>
                </select>
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              <div>
                <label style={{fontWeight: 500}}>Shipment Contents</label>
                <textarea
                  placeholder="Describe the contents of your shipment"
                  value={shipmentContents}
                  onChange={e => setShipmentContents(e.target.value)}
                  rows={4}
                  style={{width: '100%'}}
                />
              </div>
              <div>
                <label style={{fontWeight: 500}}>Tracking Options</label>
                <div className="checkbox-group" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem'}}>
                  <label style={{fontWeight: 600}}><input type="checkbox" checked={tracking} onChange={e => setTracking(e.target.checked)} /> Include tracking</label>
                  <label style={{fontWeight: 600}}><input type="checkbox" checked={deliveryConfirmation} onChange={e => setDeliveryConfirmation(e.target.checked)} /> Delivery confirmation</label>
                  <label style={{fontWeight: 600}}><input type="checkbox" checked={insurance} onChange={e => setInsurance(e.target.checked)} /> Insurance</label>
                </div>
              </div>
              <div>
                <label style={{fontWeight: 500}}>Scheduled Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  style={{width: '100%'}}
                  placeholder="dd-mm-yyyy"
                />
              </div>
            </div>
          </div>
          <button type="submit" className="create-shipment-btn" style={{marginTop: '2rem', background: '#FF4B7E', color: 'white', fontWeight: 600, fontSize: '1.2rem', borderRadius: '16px', padding: '0.8rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.7rem', border: 'none'}}>
            <FaShippingFast /> Create Shipment
          </button>
        </form>
      )}
      {activeTab === 'shipments' && (
        <div className="shipments-tab" style={{marginTop: '2rem'}}>
          <h2>Outgoing Shipments</h2>
          <table className="shipments-table" style={{width: '100%', background: 'rgba(30, 20, 60, 0.5)', borderRadius: '16px', color: 'white', borderCollapse: 'collapse', marginTop: '1.5rem'}}>
            <thead>
              <tr style={{background: 'rgba(60, 40, 100, 0.7)'}}>
                <th style={{padding: '1rem'}}>Recipient</th>
                <th>Address</th>
                <th>Type</th>
                <th>Contents</th>
                <th>Delivery Method</th>
                <th>Tracking</th>
                <th>Scheduled Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockShipments.map(shipment => (
                <tr key={shipment.id} style={{borderBottom: '1px solid #3a2a5d'}}>
                  <td style={{padding: '0.8rem 1rem'}}>{shipment.recipient}</td>
                  <td>{shipment.address}</td>
                  <td>{shipment.type}</td>
                  <td>{shipment.contents}</td>
                  <td>{shipment.deliveryMethod}</td>
                  <td>{[shipment.tracking && 'Tracking', shipment.deliveryConfirmation && 'Confirmation', shipment.insurance && 'Insurance'].filter(Boolean).join(', ') || 'None'}</td>
                  <td>{shipment.scheduledDate}</td>
                  <td>
                    <span style={{
                      background: shipment.status === 'Delivered' ? '#4CAF50' : shipment.status === 'In Transit' ? '#FFB300' : '#6C5DD3',
                      color: 'white',
                      borderRadius: '12px',
                      padding: '0.3rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                    }}>{shipment.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Mailbox;