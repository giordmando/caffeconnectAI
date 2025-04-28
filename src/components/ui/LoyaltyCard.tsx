import React from 'react';

interface LoyaltyHistory {
  date: string;
  points: number;
  reason: string;
}

interface NextTier {
  name: string;
  pointsNeeded: number;
}

interface LoyaltyCardProps {
  points: number;
  tier: string;
  nextTier: NextTier;
  history: LoyaltyHistory[];
  id: string;
  onAction?: (action: string, payload: any) => void;
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({
  points,
  tier,
  nextTier,
  history,
  id,
  onAction
}) => {
  // Calcola la percentuale di progressso verso il prossimo tier
  const progressPercentage = Math.min(
    100, 
    (points / (points + nextTier.pointsNeeded)) * 100
  );
  
  // Gestione click sulla card
  const handleCardClick = () => {
    if (onAction) {
      onAction('view_loyalty', { 
        points, 
        tier, 
        nextTier
      });
    }
  };
  
  return (
    <div className="loyalty-card" id={id} onClick={handleCardClick}>
      <div className="loyalty-header">
        <h3>Il tuo programma fedeltà</h3>
        <div className="tier-badge">{tier}</div>
      </div>
      
      <div className="loyalty-points">
        <div className="points-value">{points}</div>
        <div className="points-label">punti</div>
      </div>
      
      <div className="next-tier">
        <p>Ti mancano <strong>{nextTier.pointsNeeded} punti</strong> per raggiungere {nextTier.name}</p>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {history && history.length > 0 && (
        <div className="loyalty-history">
          <h4 className="history-title">Attività recenti</h4>
          {history.slice(0, 3).map((item, index) => (
            <div key={index} className="history-item">
              <span className="history-date">
                {new Date(item.date).toLocaleDateString()}
              </span>
              <span className="history-reason">{item.reason}</span>
              <span className="history-points">+{item.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};