# HTTPS Configuration Guide

## Why HTTPS Redirect is NOT Done in Node.js

This application **intentionally does NOT implement HTTPS redirect at the Node.js application layer**. This is a deliberate architectural decision based on best practices for production deployments.

### Rationale

1. **Separation of Concerns**: HTTPS termination and redirect should be handled by infrastructure components (reverse proxies, load balancers, CDN), not application code.

2. **Performance**: Reverse proxies like Nginx are optimized for handling SSL/TLS termination with significantly better performance than Node.js.

3. **Flexibility**: Allows the Node.js app to run in different environments (local dev, staging, production) without code changes.

4. **Security**: Centralizing SSL/TLS configuration at the infrastructure layer reduces the attack surface and makes certificate management easier.

5. **Standard Practice**: In cloud-native and containerized deployments, HTTPS is almost always handled by platform services (AWS ALB, Kubernetes Ingress, Cloudflare, etc.).

---

## HTTPS Configuration by Environment

### 1. Nginx Reverse Proxy

**Use case**: Traditional VPS, dedicated server, or self-hosted infrastructure.

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/restaurant-backend

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.example.com;

    # Redirect all HTTP requests to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.example.com;

    # SSL Certificate (Let's Encrypt recommended)
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # SSL Configuration (Mozilla Modern)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Enable Configuration

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/restaurant-backend /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### SSL Certificate with Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (Certbot will auto-configure Nginx)
sudo certbot --nginx -d api.example.com

# Auto-renewal is configured by default
# Test renewal
sudo certbot renew --dry-run
```

---

### 2. AWS Application Load Balancer (ALB)

**Use case**: AWS EC2, ECS, or Kubernetes deployment.

#### Configuration Steps

1. **Create Target Group**:
   - Protocol: HTTP
   - Port: 3000 (your Node.js app port)
   - Health check path: `/health`

2. **Create Application Load Balancer**:
   - Scheme: Internet-facing
   - IP address type: IPv4
   - Listeners:
     - HTTP (port 80): Redirect to HTTPS
     - HTTPS (port 443): Forward to target group

3. **Configure SSL Certificate**:
   - Use AWS Certificate Manager (ACM) to provision free SSL certificate
   - Attach certificate to HTTPS listener

4. **Security Group Configuration**:
   ```
   Inbound Rules:
   - Type: HTTP, Port: 80, Source: 0.0.0.0/0
   - Type: HTTPS, Port: 443, Source: 0.0.0.0/0

   Target Security Group:
   - Type: Custom TCP, Port: 3000, Source: ALB Security Group
   ```

5. **Listener Rules (HTTP -> HTTPS Redirect)**:
   ```json
   {
     "Type": "redirect",
     "RedirectConfig": {
       "Protocol": "HTTPS",
       "Port": "443",
       "StatusCode": "HTTP_301"
     }
   }
   ```

#### CloudFormation Example

```yaml
Resources:
  LoadBalancerListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      DefaultActions:
        - Type: redirect
          RedirectConfig:
            Protocol: HTTPS
            Port: 443
            StatusCode: HTTP_301
      LoadBalancerArn: !Ref LoadBalancer
      Port: 80
      Protocol: HTTP

  LoadBalancerListenerHTTPS:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref TargetGroup
      LoadBalancerArn: !Ref LoadBalancer
      Port: 443
      Protocol: HTTPS
      Certificates:
        - CertificateArn: !Ref Certificate
```

---

### 3. Cloudflare (CDN + Security)

**Use case**: Any hosting with DNS control.

#### Configuration Steps

1. **Add Site to Cloudflare**:
   - Add your domain to Cloudflare
   - Update nameservers at your domain registrar

2. **SSL/TLS Settings**:
   - Go to SSL/TLS tab
   - Encryption mode: **Full (strict)** (recommended) or **Full**
   - Enable **Always Use HTTPS**

3. **Page Rules** (Optional - for granular control):
   ```
   URL: http://*api.example.com/*
   Setting: Always Use HTTPS
   ```

4. **Edge Certificates**:
   - Cloudflare provides free SSL certificate automatically
   - Auto-renews

5. **Security Settings**:
   - Enable **HSTS** (HTTP Strict Transport Security)
   - Enable **Automatic HTTPS Rewrites**

#### Benefits
- Free SSL certificate
- DDoS protection
- CDN caching
- Web Application Firewall (WAF)
- Bot protection

---

### 4. Docker + Kubernetes

**Use case**: Container orchestration in production.

#### Kubernetes Ingress (with cert-manager)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: restaurant-backend-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: restaurant-backend-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: restaurant-backend
            port:
              number: 3000
```

#### cert-manager ClusterIssuer

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

---

## Production Security Checklist

Before deploying to production, ensure:

- [ ] **HTTPS is enforced** (all HTTP requests redirect to HTTPS)
- [ ] **SSL certificate is valid** and auto-renews
- [ ] **TLS version**: Minimum TLSv1.2, prefer TLSv1.3
- [ ] **HSTS header** is set with long max-age (1-2 years)
- [ ] **Security headers** are configured:
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] **CORS** is properly configured (only allowed origins)
- [ ] **Rate limiting** is enabled (already in main.ts)
- [ ] **Firewall rules** restrict access to Node.js port (only from reverse proxy)
- [ ] **Certificate expiry monitoring** is in place
- [ ] **HTTP/2** is enabled for better performance

---

## Local Development (No HTTPS Required)

For local development, HTTPS is **NOT required**:

```bash
# Node.js runs on HTTP (localhost)
npm run dev
```

**Why?**
- Browsers trust `localhost` without HTTPS
- Simplifies development workflow
- Production infrastructure handles HTTPS

**When you DO need HTTPS locally** (rare cases like testing PWA, secure cookies):

1. Use [mkcert](https://github.com/FiloSottile/mkcert) for local CA
2. Or use Cloudflare Tunnel for temporary public HTTPS

---

## Testing HTTPS Configuration

### SSL Labs Test

```
https://www.ssllabs.com/ssltest/analyze.html?d=api.example.com
```

Aim for **A+ rating**.

### Check Redirect

```bash
# Should return 301/302 redirect to HTTPS
curl -I http://api.example.com

# Should return 200 with valid certificate
curl -I https://api.example.com
```

### Check HSTS Header

```bash
curl -I https://api.example.com | grep -i strict
```

Expected: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

---

## Troubleshooting

### Mixed Content Warnings

**Problem**: Frontend loads over HTTPS but makes HTTP API requests.

**Solution**:
- Ensure frontend uses `https://api.example.com` in API calls
- Check CORS configuration allows HTTPS origin

### Certificate Errors

**Problem**: "NET::ERR_CERT_AUTHORITY_INVALID"

**Solution**:
- Verify certificate chain is complete (fullchain.pem)
- Check certificate matches domain
- Ensure intermediate certificates are included

### Redirect Loops

**Problem**: Infinite redirect between HTTP and HTTPS.

**Solution**:
- Check `X-Forwarded-Proto` header is passed by reverse proxy
- Verify Node.js app is NOT implementing its own redirect

---

## Related Configuration

- **CORS**: Already configured in `src/main.ts` (lines 56-88)
- **Rate Limiting**: Already configured in `src/main.ts` (lines 95-109)
- **Helmet Security Headers**: Already enabled in `src/main.ts` (line 89)
- **Compression**: Already enabled in `src/main.ts` (line 90)

---

## Summary

**Do NOT add HTTPS redirect to the Node.js application code.**

Instead:
1. ✅ Use Nginx, ALB, or Cloudflare for HTTPS termination
2. ✅ Let infrastructure handle SSL/TLS
3. ✅ Keep Node.js app simple and environment-agnostic
4. ✅ Follow the principle of separation of concerns

**This is the industry-standard approach for production Node.js deployments.**
