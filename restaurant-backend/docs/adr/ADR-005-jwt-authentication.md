# ADR-005: Use JWT for API Authentication

## Status

Accepted

## Context

The restaurant backend exposes REST APIs for:
- POS clients (web, mobile)
- Admin dashboard (web)
- Future third-party integrations (delivery platforms, accounting systems)

**Requirements**:
- **Stateless Authentication**: No server-side session storage (supports horizontal scaling)
- **Role-Based Access**: Admin, cashier, waiter roles with different permissions
- **Mobile Support**: Token-based auth works well with mobile apps
- **Security**: Protect against common attacks (XSS, CSRF, token theft)
- **User Experience**: Long-lived sessions without frequent re-login
- **Revocation**: Ability to invalidate tokens (e.g., on logout, password change)

**Alternatives Considered**:

1. **Session Cookies (Express Session + Redis)**:
   - Pros: Simple, well-understood, built-in logout
   - Cons: Requires Redis/database lookup on every request, doesn't scale horizontally without sticky sessions, CSRF protection needed

2. **OAuth 2.0 / OpenID Connect**:
   - Pros: Industry standard, supports third-party login
   - Cons: Overkill for internal restaurant system, complex setup, requires identity provider

3. **JWT (JSON Web Tokens)**:
   - Pros: Stateless, no database lookup, scales horizontally, works with mobile/web
   - Cons: Harder to revoke, token size larger than session IDs, requires refresh token strategy

4. **API Keys**:
   - Pros: Simple for third-party integrations
   - Cons: No user context, hard to revoke, poor UX for human users

## Decision

Use **JWT (JSON Web Tokens)** with **refresh tokens** for authentication.

**Implementation**:
- **Access Token**: Short-lived JWT (15 minutes), contains user ID, role, permissions
- **Refresh Token**: Long-lived (7 days), stored in httpOnly cookie, used to obtain new access tokens
- **Token Storage**: Access token in memory (frontend), refresh token in httpOnly cookie
- **Revocation**: Maintain refresh token blacklist in database (or Redis)

**JWT Payload**:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "username": "admin",
  "role": "admin",
  "permissions": ["create_invoice", "manage_users", "view_reports"],
  "iat": 1640000000,
  "exp": 1640000900
}
```

**Authentication Flow**:
1. User logs in → Server validates credentials
2. Server issues access token (15 min) + refresh token (7 days)
3. Client stores access token in memory, refresh token in httpOnly cookie
4. Client includes access token in `Authorization: Bearer <token>` header
5. When access token expires, client uses refresh token to get new access token
6. On logout, refresh token is blacklisted

## Consequences

### Positive

- **Stateless**: No server-side session storage; supports horizontal scaling
- **Performance**: No database lookup on every request (JWT is self-contained)
- **Mobile-Friendly**: Token-based auth works seamlessly with mobile apps
- **Microservices-Ready**: JWT can be validated by multiple services without shared state
- **CORS-Friendly**: Works with cross-origin requests (e.g., admin.restaurant.com → api.restaurant.com)
- **Role-Based Access**: Permissions embedded in token, checked in middleware
- **Developer Experience**: Standard pattern, many libraries available

### Negative

- **Token Revocation**: Harder to invalidate tokens before expiration (mitigated by short access token lifetime)
- **Token Size**: JWTs are larger than session IDs (200-300 bytes vs. 32 bytes)
- **Secret Management**: JWT secret must be kept secure; compromise = all tokens invalid
- **Refresh Token Storage**: Requires database for refresh token blacklist
- **Clock Skew**: Server clocks must be synchronized (use NTP)
- **Token Theft**: If access token is stolen, attacker has access until expiration (mitigated by HTTPS + short expiration)

### Mitigations

- **Short Access Token Expiration**: 15 minutes limits damage if token is stolen
- **Refresh Token Rotation**: Issue new refresh token on each refresh (detect token reuse attacks)
- **httpOnly Cookies**: Refresh token in httpOnly cookie prevents XSS theft
- **HTTPS Only**: All tokens transmitted over HTTPS
- **Token Blacklist**: Maintain refresh token blacklist in Redis for instant revocation
- **Rate Limiting**: Limit login and refresh attempts to prevent brute force
- **Logout Endpoint**: Blacklist refresh token on logout
- **Password Change**: Invalidate all tokens on password change

## Implementation Details

**Token Generation** (`src/infrastructure/utils/JWTService.ts`):
```typescript
class JWTService {
  generateAccessToken(user: User): string {
    return jwt.sign(
      { userId: user.id, role: user.role, permissions: user.permissions },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  generateRefreshToken(): string {
    return jwt.sign(
      { type: 'refresh', tokenId: uuid() },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }
}
```

**Authentication Middleware** (`src/infrastructure/web/middleware/auth.middleware.ts`):
```typescript
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user to request
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

**Login Route** (`src/infrastructure/web/routes/authRoutes.ts`):
```typescript
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const loginUseCase = container.getLoginUseCase();
  const result = await loginUseCase.execute(username, password);

  if (result) {
    const accessToken = jwtService.generateAccessToken(result.user);
    const refreshToken = jwtService.generateRefreshToken();

    // Store refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({ user: result.user, token: accessToken });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});
```

**Refresh Token Route**:
```typescript
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  // Check if token is blacklisted
  const isBlacklisted = await tokenBlacklist.isBlacklisted(refreshToken);
  if (isBlacklisted) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await userRepository.findById(decoded.userId);

    const newAccessToken = jwtService.generateAccessToken(user);
    const newRefreshToken = jwtService.generateRefreshToken();

    // Rotate refresh token
    await tokenBlacklist.blacklist(refreshToken);
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, ... });

    return res.json({ token: newAccessToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

**Environment Variables**:
```bash
JWT_SECRET=your-access-token-secret-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

## Security Considerations

- **Secret Rotation**: Periodically rotate JWT_SECRET; invalidates all existing tokens
- **Token Storage**: NEVER store tokens in localStorage (vulnerable to XSS); use memory + httpOnly cookies
- **HTTPS Enforcement**: Always use HTTPS in production to prevent token interception
- **Rate Limiting**: Limit login attempts (5 per minute per IP) to prevent brute force
- **CORS Configuration**: Restrict allowed origins to prevent unauthorized cross-origin requests

## References

- [JWT.io](https://jwt.io/)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- `src/infrastructure/utils/JWTService.ts` - JWT generation/validation
- `src/infrastructure/web/middleware/` - Authentication middleware
