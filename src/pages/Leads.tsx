import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useLeadStore from '../store/leadStore';
import useCustomerStore from '../store/customerStore';
import LeadManagement from '../components/leads/LeadManagement';
import { Lead } from '../types';

const Leads = () => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <LeadManagement 
      selectedLead={selectedLead}
      setSelectedLead={setSelectedLead}
    />
  );
};

export default Leads;