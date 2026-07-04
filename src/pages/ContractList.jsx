import React from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Plus, Filter, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function ContractList() {
  const navigate = useNavigate();

  const allContracts = [
    { id: 'CON-1024', title: 'Software License Agreement', vendor: 'Acme Corp', status: 'active', value: '$12,000', date: new Date(2023, 9, 15) },
    { id: 'CON-1025', title: 'Cloud Hosting Services', vendor: 'TechCloud', status: 'review', value: '$45,000', date: new Date(2023, 9, 20) },
    { id: 'CON-1026', title: 'Office Lease 2024', vendor: 'RealEstate Ltd', status: 'draft', value: '$120,000', date: new Date(2023, 9, 22) },
    { id: 'CON-1027', title: 'Consulting NDA', vendor: 'Jane Doe', status: 'expired', value: '-', date: new Date(2023, 9, 1) },
    { id: 'CON-1028', title: 'Marketing Retainer', vendor: 'AdAgency', status: 'active', value: '$8,500', date: new Date(2023, 8, 10) },
    { id: 'CON-1029', title: 'Hardware Supply', vendor: 'CompSupplies', status: 'review', value: '$22,400', date: new Date(2023, 8, 25) },
  ];

  const columns = [
    { header: 'ID', accessorKey: 'id', className: 'font-medium' },
    { header: 'Title', accessorKey: 'title' },
    { header: 'Vendor/Party', accessorKey: 'vendor' },
    { header: 'Value', accessorKey: 'value' },
    { 
      header: 'Start Date', 
      cell: (row) => format(row.date, 'MMM dd, yyyy') 
    },
    { 
      header: 'Status', 
      cell: (row) => <Badge status={row.status}>{row.status}</Badge> 
    }
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Contracts</h1>
          <p className="page-description" style={{ marginBottom: 0 }}>Manage all your contracts in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="secondary" icon={<Filter size={18} />}>Filter</Button>
          <Button variant="secondary" icon={<Download size={18} />}>Export</Button>
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => navigate('/contracts/new')}>
            New Contract
          </Button>
        </div>
      </div>

      <Card>
        <Table 
          columns={columns} 
          data={allContracts} 
          onRowClick={(row) => navigate(`/contracts/${row.id}`)}
        />
      </Card>
    </div>
  );
}
