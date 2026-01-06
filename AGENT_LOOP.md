# SurfingKeys Automation Testing Loop

## Required Steps (DO NOT SKIP ANY)

The agent loop for testing and improving SurfingKeys automation should follow these exact steps in order:

### 1. Make Changes to surfingkeys.js
- Identify issues in the automation code
- Implement fixes/improvements in the surfingkeys.js file
- Ensure changes are focused and targeted

### 2. Push Changes
- `git add -A`
- `git commit -m "descriptive message"`
- `git push`

### 3. Wait 10 Seconds
- Allow SurfingKeys extension to reload the new configuration
- `sleep 10`

### 4. Use MCP to Open URL with SK Parameters
- Open Perplexity.ai with hash parameters
- Example: `https://perplexity.ai#sk_prompt=&sk_mode=research&sk_social=onTest query here`
- **DO NOT** manually click anything via MCP
- The SurfingKeys automation should handle ALL interactions automatically

### 5. Check Results
- Verify Research mode is automatically activated
- Check if Social toggle is automatically enabled (if sk_social=on)
- Confirm query is automatically injected into textbox
- Verify automation submits search automatically

### 6. Review Console Logs
- Check for SurfingKeys debug messages: `[SK Debug]`
- Look for any JavaScript errors
- Ensure no automation errors occurred

## Critical Rules

1. **NO MANUAL MCP INTERACTIONS**: The automation must work completely hands-off
2. **VERIFY EACH STEP**: Don't assume previous steps worked
3. **CHECK CONSOLE LOGS**: Always review debug output and errors
4. **COMPLETE THE LOOP**: Don't skip the 10-second wait or verification steps

## Success Criteria

The automation is working correctly when:
- Page loads with sk parameters in URL
- Research radio is automatically checked (if sk_mode=research)
- Sources menu automatically opens and Social toggle activates (if sk_social=on)
- Query text automatically appears in the textbox
- Search automatically submits
- All actions happen without manual intervention
- Console shows successful debug logs with no errors

## Current Issues to Address

- Automation trigger not executing on page load
- Debug logs not appearing in console
- Need to verify DOM ready detection is working properly