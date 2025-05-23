import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; // adjust path if needed

const getDisplayValue = (value, defaultText = "Not set") => {
  if (value === null || value === undefined || value === "") {
    return defaultText;
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    return value;
  }
  
  // Handle strings
  if (typeof value === 'string') {
    return value.trim() || defaultText;
  }
  
  // Return the value as is for other types
  return value;
};

const companies = [
  {
    city: "Amsterdam",
    country: "Netherlands",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    badges: [
      { text: "Branch Office", type: "branch" },
      { text: "Active", type: "active" }
    ],
    market: "€908B GDP",
    tax: "15-25.8%",
  },
  {
    city: "Berlin",
    country: "Germany",
    image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=400&q=80",
    badges: [
      { text: "Tax ID", type: "tax" },
      { text: "Pending", type: "pending" }
    ],
    market: "€3.5T GDP",
    tax: "15%",
  },
  {
    city: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
    badges: [
      { text: "Virtual Office", type: "virtual" },
      { text: "Under Consideration", type: "consideration" }
    ],
    market: "€2.63T GDP",
    tax: "25%",
  },
  {
    city: "Madrid",
    country: "Spain",
    image: "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=400&q=80",
    badges: [
      { text: "Legal Entity", type: "legal" },
      { text: "Under Consideration", type: "consideration" }
    ],
    market: "€1.28T GDP",
    tax: "25%",
  },
  {
    city: "Rome",
    country: "Italy",
    image: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    badges: [
      { text: "Virtual Office", type: "virtual" },
      { text: "Open", type: "open" }
    ],
    market: "€1.89T GDP",
    tax: "24%",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editLocation, setEditLocation] = useState("");
  const [editSubsidiaries, setEditSubsidiaries] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCompany({
            company_name: "Not set",
            company_type: "Not set",
            base_location: "Not set",
            status: "Inactive",
            subsidiaries_count: 0,
            reg_number: "Not set",
            vat_number: "Not set",
            registered_address: "Not set",
            incorporation_date: "Not set"
          });
          return;
        }

        const { data, error } = await supabase
          .from("company_info")
          .select(`
            *,
            reg_number,
            incorporation_date,
            vat_number,
            registered_address
          `)
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching company data:", error);
          // Set default values if there's an error
          setCompany({
            company_name: "Not set",
            company_type: "Not set",
            base_location: "Not set",
            status: "Inactive",
            subsidiaries_count: 0,
            reg_number: "Not set",
            vat_number: "Not set",
            registered_address: "Not set",
            incorporation_date: "Not set"
          });
          return;
        }

        setCompany(data || {
          company_name: "Not set",
          company_type: "Not set",
          base_location: "Not set",
          status: "Inactive",
          subsidiaries_count: 0,
          reg_number: "Not set",
          vat_number: "Not set",
          registered_address: "Not set",
          incorporation_date: "Not set"
        });
        setEditLocation(data?.base_location || "");
        setEditSubsidiaries(data?.subsidiaries_count || 0);
      } catch (err) {
        console.error("Error:", err);
      }
    };

    fetchCompany();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("company_info")
      .update({
        base_location: editLocation,
        subsidiaries_count: editSubsidiaries
      })
      .eq("user_id", user.id);
    if (!error) {
      setCompany((prev) => ({
        ...prev,
        base_location: editLocation,
        subsidiaries_count: editSubsidiaries
      }));
      setEditMode(false);
    }
    setSaving(false);
  };

  if (!company) return <div style={{ color: "#fff", textAlign: "center", marginTop: "2rem" }}>Loading...</div>;

  return (
    <div className="expansion-dashboard">
      <div className={`company-card1 ${isExpanded ? 'expanded' : ''}`}>
        <div className="company-card-content">
        
          <div className="company-header1">
            <div className="company-main">
              <div className="company-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="company-icon1">
                  <rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect>
                  <path d="M9 22v-4h6v4"></path>
                  <path d="M8 6h.01"></path>
                  <path d="M16 6h.01"></path>
                  <path d="M12 6h.01"></path>
                  <path d="M12 10h.01"></path>
                  <path d="M12 14h.01"></path>
                  <path d="M16 10h.01"></path>
                  <path d="M16 14h.01"></path>
                  <path d="M8 10h.01"></path>
                  <path d="M8 14h.01"></path>
                </svg>
                <div className="title-group">
                  <span className="company-name">{getDisplayValue(company.company_name)}</span>
                  <span className="company-type">
                    {getDisplayValue(company.company_type)} 
                    {company.headquarters ? " • Headquarters" : ""}
                  </span>
                </div>
              </div>
              <div className="company-meta">
                <span className="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                    <path d="M2 12h20"/>
                  </svg>
                  {editMode ? (
                    <input
                      value={editLocation}
                      onChange={e => setEditLocation(e.target.value)}
                      style={{ width: 120, borderRadius: 6, border: "1px solid #ffd600", padding: "2px 6px" }}
                    />
                  ) : (
                    getDisplayValue(company.base_location, "Netherlands")
                  )}
                </span>
              
                <span className="meta-item active">
                  <div className="status-dot"/>
                  {getDisplayValue(company.status, "Active")}
                </span>
             
                <span className="meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {editMode ? (
                    <input
                      type="number"
                      min={0}
                      value={editSubsidiaries}
                      onChange={e => setEditSubsidiaries(Number(e.target.value))}
                      style={{ width: 40, borderRadius: 6, border: "1px solid #ffd600", padding: "2px 6px" }}
                    />
                  ) : (
                    getDisplayValue(company.subsidiaries_count, 0)
                  )}
                </span>
              </div>
            </div>
            <button className="expand-button" onClick={() => setIsExpanded(!isExpanded)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}/>
              </svg>
            </button>
          </div>
          
          {isExpanded && (
            <div className="company-details1">
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label1">Registration</span>
                  <span className="detail-value">{getDisplayValue(company.reg_number)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label1">VAT ID</span>
                  <span className="detail-value">{getDisplayValue(company.vat_number)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label1">Address</span>
                  <div className="detail-value-with-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{getDisplayValue(company.registered_address)}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <span className="detail-label1">Incorporated</span>
                  <div className="detail-value-with-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                      <path d="M8 2v4"/>
                      <path d="M16 2v4"/>
                      <rect width="18" height="18" x="3" y="4" rx="2"/>
                      <path d="M3 10h18"/>
                    </svg>
                    <span>{getDisplayValue(company.incorporation_date)}</span>
                  </div>
                </div>
              </div>
          
            </div>
          )}
          
          <div className="card-footer">
            <div className="footer-actions">
              {editMode ? (
                <>
                  <button className="profile-btn" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button 
                    className="profile-btn" 
                    style={{ marginLeft: 8, background: "#3a3a6a", color: "#fff", borderColor: "#3a3a6a" }} 
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="profile-btn" onClick={() => setEditMode(true)}>
                    Edit
                  </button>
                  <button className="view-profile-btn" onClick={() => navigate('/generate-forms')}>
                    View Company Profile
                  </button>
                </>
              )}
            </div>
            <div className="subsidiary-info">
              <span>{getDisplayValue(company.subsidiaries_count, 0)} Subsidiaries</span>
              <div className="subsidiary-dots">
                {[...Array(company.subsidiaries_count || 0)].map((_, i) => (
                  <span key={i} className="subsidiary-dot" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="welcome-section">
        <h2>Welcome Back! Unlock Your Dream Destinations!</h2>
        <p>Your global empire awaits - click any city below to begin your expansion journey</p>
      </div>

      <div className="expansion-cards">
        {companies.map((c, idx) => (
          <div className="expansion-card" key={c.city}>
            <img src={c.image} alt={c.city} className="city-image" />
            <div className="card-content">
              <div className="city-name">{c.city}</div>
              <div className="country">🌍 {c.country}</div>
              <div className="badges">
                {c.badges.map((b, i) => (
                  <span className={`badge ${b.type}`} key={i}>{b.text}</span>
                ))}
              </div>
              <div className="market-info">
                <div>Market Size <b>{c.market}</b></div>
                <div>Corp. Tax <b>{c.tax}</b></div>
              </div>
              <button className="explore-btn">Explore Expansion</button>
            </div>
          </div>
        ))}
      </div>

      <button className="add-market-button" onClick={() => navigate('')}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        Add New Target Market
      </button>
    </div>
  );
}