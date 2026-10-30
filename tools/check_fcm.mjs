// Credential/API probe only. validate_only with an intentionally invalid device token
// cannot deliver a notification. Never print provider responses or access tokens.
import { readFileSync } from 'node:fs'
import { createSign } from 'node:crypto'
const env = readFileSync(new URL('../.env.tools', import.meta.url), 'utf8')
const encoded = env.match(/^FCM_SERVICE_ACCOUNT_B64=(.*)$/m)?.[1]?.trim()
if (!encoded) throw new Error('FCM private configuration missing')
const account = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
const now = Math.floor(Date.now() / 1000)
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const input = b64({alg:'RS256',typ:'JWT'}) + '.' + b64({iss:account.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})
const signature = createSign('RSA-SHA256').update(input).sign(account.private_key, 'base64url')
try {
  const response = await fetch('https://oauth2.googleapis.com/token', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:input+'.'+signature}),signal:AbortSignal.timeout(20000)})
  if(!response.ok)throw new Error('OAUTH_REJECTED')
  const auth = await response.json()
  if(!auth.access_token)throw new Error('OAUTH_REJECTED')
  const validation = await fetch('https://fcm.googleapis.com/v1/projects/'+encodeURIComponent(account.project_id)+'/messages:send',{method:'POST',headers:{Authorization:'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify({validate_only:true,message:{token:'orbit-intentionally-invalid-validation-token',notification:{title:'Orbit validation',body:'Configuration check'}}}),signal:AbortSignal.timeout(20000)})
  const result=await validation.json()
  const status=result.error?.status
  if(validation.ok || (validation.status===400 && status==='INVALID_ARGUMENT'))console.log('Firebase OAuth accepted; FCM API accessible. No device notification sent.')
  else {console.log('Firebase OAuth accepted; FCM API check failed: HTTP '+validation.status+' '+String(status??'UNKNOWN').replace(/[^A-Z_]/g,''));process.exitCode=1}
} catch {console.log('Firebase authentication or network check failed; sensitive details hidden.');process.exitCode=1}
