export default async function handler(req, res) {
  const apiKey = process.env.CLAUDE_API_KEY;
  
  return res.status(200).json({
    hasKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    keyPrefix: apiKey ? apiKey.substring(0, 20) : 'UNDEFINED',
    keySuffix: apiKey ? '...' + apiKey.substring(apiKey.length - 10) : 'UNDEFINED',
    allEnvVars: Object.keys(process.env).filter(k => k.includes('CLAUDE'))
  });
}