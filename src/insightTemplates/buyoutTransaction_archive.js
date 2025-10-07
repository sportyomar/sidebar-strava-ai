// /src/insightTemplates/buyoutTransaction.js

function generateBuyoutTransactionInsight(metrics) {
  const {
    companyName,
    acquirerName,
    acquisitionPrice,
    enterpriseValue,
    debtFinancing,
    equityFinancing,
    ownershipStake,
    date,
    rationale
  } = metrics;

  if (!companyName || !acquirerName || !acquisitionPrice || !enterpriseValue) {
    return "Insufficient data to generate insight.";
  }

  const formattedPrice = acquisitionPrice >= 1_000_000_000
    ? `$${(acquisitionPrice / 1_000_000_000).toFixed(1)}B`
    : `$${(acquisitionPrice / 1_000_000).toFixed(0)}M`;

  const formattedEV = enterpriseValue >= 1_000_000_000
    ? `$${(enterpriseValue / 1_000_000_000).toFixed(1)}B`
    : `$${(enterpriseValue / 1_000_000).toFixed(0)}M`;

  const formattedDebt = debtFinancing >= 1_000_000_000
    ? `$${(debtFinancing / 1_000_000_000).toFixed(1)}B`
    : `$${(debtFinancing / 1_000_000).toFixed(0)}M`;

  const formattedEquity = equityFinancing >= 1_000_000_000
    ? `$${(equityFinancing / 1_000_000_000).toFixed(1)}B`
    : `$${(equityFinancing / 1_000_000).toFixed(0)}M`;

  const formattedDate = date ? new Date(date).toLocaleDateString() : null;

  return (`${acquirerName} acquired ${companyName} for ${formattedPrice} in a leveraged buyout. ` +
         `The deal implies an enterprise value of ${formattedEV}, with ${formattedDebt} in debt financing and ${formattedEquity} in equity. ` +
         `${acquirerName} will own a ${ownershipStake}% stake post-transaction. ` +
         (rationale ? `The acquisition rationale includes: "${rationale}". ` : '') +
         (formattedDate ? `The transaction closed on ${formattedDate}.` : '')).trim();
}

export default generateBuyoutTransactionInsight;