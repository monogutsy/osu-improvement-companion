import Card from '../ui/Card';

export default function StatCard({ icon, label, value, trend }) {
  return (
    <Card className="stat-card">
      {icon ? <div className="stat-card__icon">{icon}</div> : null}
      <div className="stat-card__content">
        <p className="stat-card__label">{label}</p>
        <h3 className="stat-card__value">{value}</h3>
        {trend ? <p className="stat-card__trend">{trend}</p> : null}
      </div>
    </Card>
  );
}
