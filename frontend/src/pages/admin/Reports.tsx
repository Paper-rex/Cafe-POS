import { Card } from '../../components/ui/Card';
import { BarChart3 } from 'lucide-react';

export default function Reports() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-text-primary mb-2">Reports</h1>
      <p className="text-text-secondary mb-8">View analytics and export data</p>
      <Card className="p-12 text-center">
        <BarChart3 className="w-16 h-16 text-text-muted mx-auto mb-4" />
        <h3 className="font-display text-xl font-semibold text-text-primary mb-2">Reports Dashboard</h3>
        <p className="text-text-secondary">Revenue charts, order analytics, and exports are available on the Dashboard page. Full monthly reports coming soon.</p>
      </Card>
    </div>
  );
}
