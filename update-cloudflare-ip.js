const os = require('os');
const fetch = require('node-fetch');
const interfaces = os.networkInterfaces();
const args = require('minimist')(process.argv.slice(2))

const { CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ZONE } = process.env;
const cloudflareEndpoint = 'https://api.cloudflare.com/client/v4/';

const interfaceName = args.interface || args.i || 'eth0';
const newHostName = args.host || args.h;
const apiKey = CLOUDFLARE_API_KEY || args.key || args.k;
const email = CLOUDFLARE_EMAIL || args.email || args.e;
const zone = CLOUDFLARE_ZONE || args.zone || args.z;

if(!newHostName) {
  throw new Error('host required (--host example.com | -h example.com)')
}

if(!interfaces[interfaceName]) {
  throw new Error(`Interface ${interfaceName} not found!`)
}

const ipv4 = interfaces[interfaceName].filter(ip => ip.family === 'IPv4')[0];

const authHeaders = {
  'X-Auth-Key': apiKey,
  'X-Auth-Email': email
}

getCurrentDNSRecord(newHostName).then(dnsRecord => {
  if(!dnsRecord) {
    console.log('Creating new record for', newHostName)
    return createNewDNSRecord(newHostName, ipv4.address)
  }
  return updateDNSRecord(dnsRecord.id, newHostName, ipv4.address)
}).then(result => {
  console.log({result})
}).catch(error => {
  throw new Error(error)
})

/**
 * Retrieves the current Cloudflare record for a hostname
 * @param {string} hostname 
 */
function getCurrentDNSRecord(hostname) {
  return fetch(`${cloudflareEndpoint}zones/${zone}/dns_records`, {
    headers: authHeaders
  }).then(response => {
    return response.json();
  }).then(jsonResponse => {
    return jsonResponse.result.filter(record => record.name === hostname)[0]
  })
}

/**
 * Creates a new Cloudflare DNS record.
 * @param {string} hostname 
 * @param {string} ip 
 */
function createNewDNSRecord(hostname, ip) {
  const postData = {
    type: 'A',
    name: hostname,
    content: ip
  }

  return fetch(`${cloudflareEndpoint}zones/${zone}/dns_records`, {
    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
    method: 'POST',
    body: JSON.stringify(postData)
  }).then(response => response.json()).then(jsonResponse => jsonResponse.result)
}

/**
 * Updates an existing cloudflare DNS record
 * @param {string} recordID 
 * @param {string} hostname 
 * @param {string} ip 
 */
function updateDNSRecord(recordID, hostname, ip) {
  const putData = {
    type: 'A',
    name: hostname,
    content: ip
  }

  return fetch(`${cloudflareEndpoint}zones/${zone}/dns_records/${recordID}`, {
    headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders),
    method: 'PUT',
    body: JSON.stringify(putData)
  }).then(response => response.json()).then(jsonResponse => jsonResponse.result)
}
