# Message Throttle System

## Overview

The message throttle system has been implemented to reduce server costs and spam during the free launch. It applies limits to non-subscribed men while keeping women, moderators, and paying subscribers exempt.

**Note**: Public chat rooms have been completely removed from the application. Only 1-on-1 private messaging is available.

## Features Implemented

### 1. Consecutive Message Limit
- **Default**: 2 messages per recipient until they reply
- **Configurable via**: `MAX_CONSECUTIVE_MESSAGES` env variable
- Prevents spam by requiring recipients to respond before receiving more messages
- **Exemptions**: Women, moderators, and paying subscribers can send unlimited consecutive messages

**How it works:**
1. User sends first message to a recipient → Success
2. User sends second message to same recipient → Success
3. User tries to send third message → **Blocked** with error:
   > "You can only send 2 messages until they reply. Please wait for a response before sending more."
4. Recipient replies → Counter resets
5. User can now send 2 more messages

### 2. Hourly Recipient Limit
- **Default**: 5 unique recipients per hour
- **Configurable via**: `MAX_HOURLY_RECIPIENTS` env variable
- Prevents mass messaging spam
- **Exemptions**: Women, moderators, and paying subscribers can message unlimited recipients

**How it works:**
1. User messages 5 different people within an hour → Success
2. User tries to message a 6th new person → **Blocked** with error:
   > "You can only message 5 different people per hour. Try again in 23 minutes."
3. User can still continue conversations with the 5 existing recipients
4. After 1 hour from the first message, the counter resets
5. Error message includes exact time remaining until they can message new people

### 3. Server-Side Logging
- All throttle events are logged to the console
- Format: `[THROTTLE] User {userId} hit {throttle_type} limit`
- Useful for monitoring spam attempts and tuning thresholds

### 4. Client-Side Error Handling
- Clear, user-friendly error messages displayed in the chat UI
- Auto-dismiss after 8 seconds for throttle errors
- Distinct error messages for each throttle type
- Time remaining shown for hourly limits

### 5. Additional Protections
- **Block Prevention**: Users cannot message people who have blocked them
- **Suspended/Hidden Users**: Cannot message suspended or hidden accounts (returns 404 "User not found")
- **Database Indexes**: Optimized queries with indexes on `(fromId, toId, ts)` and `(fromId, ts)` for fast throttle checks
- **Dynamic Limits**: All error messages use actual configured values, not hardcoded numbers

## Configuration

Add these to your `server/.env` file:

```env
# Message throttle settings (for free launch spam reduction)
MAX_CONSECUTIVE_MESSAGES=2        # Messages until reply required
MAX_HOURLY_RECIPIENTS=5           # New recipients per hour limit
```

## Testing Scenarios

### Test 1: Consecutive Message Limit (as a man)
1. Create two male test accounts
2. Send 2 messages from Account A to Account B
3. Try to send a 3rd message → Should see throttle error
4. Reply from Account B to Account A
5. Send another message from A to B → Should succeed

### Test 2: Hourly Recipient Limit (as a man)
1. Create 6+ female test accounts
2. Message 5 different women from one male account
3. Try to message a 6th woman → Should see throttle error
4. Continue messaging one of the first 5 → Should succeed
5. Wait 1 hour or change system time → Should be able to message new recipients

### Test 3: Women Exemption
1. Create a female account
2. Send unlimited messages to multiple recipients
3. Should never hit any throttle limits

## Benefits

1. **Cost Savings**:
   - Reduces WebSocket events from spam
   - Lowers database write operations
   - Decreases API call volume
   - Database indexes speed up queries significantly

2. **Spam Prevention**:
   - Prevents mass messaging attacks
   - Reduces harassment potential
   - Encourages meaningful conversations
   - Blocks don't count against throttle quotas

3. **User Experience**:
   - Women get a better experience (less spam)
   - Men are encouraged to be thoughtful with messages
   - Clear feedback when limits are reached with time remaining
   - Subscribers get full messaging privileges (monetization incentive)

4. **Monetization**:
   - Free users face limits, creating incentive to subscribe
   - Paying men get unlimited messaging (same as women)
   - Clear value proposition for subscription

## Recommended Settings for Free Launch

```env
MAX_CONSECUTIVE_MESSAGES=2        # Encourage back-and-forth conversation
MAX_HOURLY_RECIPIENTS=5           # Reasonable outreach limit
```

## Monitoring & Tuning

Watch your server logs for `[THROTTLE]` entries to see:
- How often limits are hit
- Which users are hitting limits
- Whether to adjust thresholds

If you see too many legitimate users hitting limits, you can increase:
- `MAX_CONSECUTIVE_MESSAGES` to 3 or 4
- `MAX_HOURLY_RECIPIENTS` to 7 or 10

## Future Enhancements

Consider adding:
- Different limits for verified vs. unverified users
- Time-based escalation (longer limits for repeat offenders)
- Admin dashboard to view throttle statistics
- User feedback showing how many messages/recipients remaining
