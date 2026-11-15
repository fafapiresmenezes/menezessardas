-- C9: Boletim (Newsletter Archive)
CREATE TABLE IF NOT EXISTS boletim_archive (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_number INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  content JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- C10: Municipality Geo Data
CREATE TABLE IF NOT EXISTS municipality_geo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  area_km2 DECIMAL(12, 2)
);

-- C14: Pilot Programs
CREATE TABLE IF NOT EXISTS pilot_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pilot_id VARCHAR(100) UNIQUE NOT NULL,
  market VARCHAR(50) NOT NULL,
  municipality_code VARCHAR(10) NOT NULL,
  partner_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  enrolled_date TIMESTAMP NOT NULL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  signals_generated INTEGER DEFAULT 0,
  signals_accurate INTEGER DEFAULT 0,
  revenue_brl DECIMAL(15, 2) DEFAULT 0
);

-- C18: Backtest Results
CREATE TABLE IF NOT EXISTS backtest_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  market_code VARCHAR(50) NOT NULL,
  market_name VARCHAR(255) NOT NULL,
  test_period_start DATE NOT NULL,
  test_period_end DATE NOT NULL,
  total_signals INTEGER NOT NULL,
  true_positives INTEGER NOT NULL,
  false_positives INTEGER NOT NULL,
  true_negatives INTEGER NOT NULL,
  false_negatives INTEGER NOT NULL,
  accuracy DECIMAL(5, 2) NOT NULL,
  precision DECIMAL(5, 2) NOT NULL,
  recall DECIMAL(5, 2) NOT NULL,
  f1_score DECIMAL(5, 4) NOT NULL,
  auc_roc DECIMAL(3, 2) NOT NULL
);

CREATE INDEX idx_boletim_issue ON boletim_archive(issue_number DESC);
CREATE INDEX idx_pilot_market ON pilot_programs(market);
CREATE INDEX idx_backtest_market ON backtest_results(market_code);
