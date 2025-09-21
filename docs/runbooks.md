# Operations Runbooks

This document contains runbooks for common operational scenarios and incident response procedures.

## Table of Contents

1. [Twilio Outage Response](#twilio-outage-response)
2. [Stripe Retry Storms](#stripe-retry-storms)
3. [Webhook Backlog Management](#webhook-backlog-management)
4. [Consent Complaint Handling](#consent-complaint-handling)
5. [System Performance Degradation](#system-performance-degradation)

## Twilio Outage Response

### Detection

- Health check endpoint reports Twilio service as down
- Twilio Debugger shows increased error rates
- Customer reports of calls not being answered
- Alert from health_watch workflow

### Immediate Actions

1. **Acknowledge the alert**
   - Post in team communication channel
   - Assign incident commander

2. **Verify the issue**
   - Check Twilio Status Page (status.twilio.com)
   - Review Twilio Debugger for specific error patterns
   - Confirm issue is not isolated to specific numbers or regions

3. **Implement mitigation**
   - If partial outage, redistribute calls to working numbers
   - Enable fallback mechanisms (voicemail only mode)
   - Notify affected merchants via email

### Communication

1. **Internal**
   - Post status updates every 30 minutes in team channel
   - Document all actions taken in incident log

2. **External**
   - Send status update to affected merchants
   - Update status page if applicable

### Recovery

1. **Monitor for service restoration**
   - Watch Twilio Status Page
   - Test call flows manually

2. **Gradual restoration**
   - Re-enable services in batches
   - Monitor for any residual issues

3. **Post-incident review**
   - Document root cause
   - Identify improvements to prevent recurrence
   - Update this runbook if needed

## Stripe Retry Storms

### Detection

- Spike in Stripe webhook processing time
- Increased error rates in stripe_webhook_router workflow
- Alert from health_watch workflow
- Merchant reports of delayed payment notifications

### Immediate Actions

1. **Acknowledge the alert**
   - Post in team communication channel
   - Assign incident commander

2. **Assess the situation**
   - Check Stripe Status Page (status.stripe.com)
   - Review webhook processing queues
   - Identify if this is a Stripe issue or internal processing issue

3. **Implement rate limiting**
   - Temporarily reduce concurrency in webhook processing
   - Implement exponential backoff for retries
   - Prioritize critical webhooks (payments over metadata updates)

### Communication

1. **Internal**
   - Post status updates every 15 minutes in team channel
   - Document all actions taken in incident log

2. **External**
   - If significant delays expected, notify merchants
   - Prepare communication for affected customers

### Recovery

1. **Monitor for improvement**
   - Watch processing times and error rates
   - Gradually increase concurrency as system stabilizes

2. **Clear backlog**
   - Process queued webhooks with increased resources if needed
   - Verify all critical payments were processed correctly

3. **Post-incident review**
   - Document root cause
   - Identify improvements to prevent recurrence
   - Update this runbook if needed

## Webhook Backlog Management

### Detection

- Health check shows increased webhook processing latency
- Alert from health_watch workflow
- Merchant reports of delayed notifications
- Monitoring shows growing queue depth

### Immediate Actions

1. **Acknowledge the alert**
   - Post in team communication channel
   - Assign incident commander

2. **Assess the backlog**
   - Check current queue depth
   - Identify oldest unprocessed webhooks
   - Determine if this is a temporary spike or sustained issue

3. **Scale processing capacity**
   - Add additional webhook processing workers
   - Temporarily increase database connection pools
   - Consider prioritizing critical webhooks

### Communication

1. **Internal**
   - Post status updates every 30 minutes in team channel
   - Document all actions taken in incident log

2. **External**
   - If significant delays expected, notify merchants
   - Prepare communication for affected customers

### Recovery

1. **Monitor queue depth**
   - Watch for decreasing backlog
   - Adjust processing capacity as needed

2. **Verify data integrity**
   - Confirm all webhooks were processed correctly
   - Check for any missed notifications that need manual handling

3. **Scale back**
   - Gradually reduce additional processing capacity
   - Return to normal operations

4. **Post-incident review**
   - Document root cause
   - Identify improvements to prevent recurrence
   - Update this runbook if needed

## Consent Complaint Handling

### Detection

- Customer contacts support about unwanted messages
- STOP messages received from customers
- Compliance audit flags potential issues

### Immediate Actions

1. **Acknowledge the complaint**
   - Respond to customer within 1 hour
   - Log the complaint in support system

2. **Verify consent status**
   - Check consents table for customer record
   - Verify when and how consent was obtained
   - Check for any previous STOP requests

3. **Implement immediate fix**
   - Add customer to global suppression list
   - Disable all messaging to that number across all merchants
   - Confirm no further messages will be sent

### Communication

1. **Customer response**
   - Apologize for the unwanted messages
   - Confirm they have been opted out
   - Provide method for re-consent if desired

2. **Internal**
   - Post in team communication channel
   - Document all actions taken in incident log
   - Notify compliance team

### Investigation

1. **Root cause analysis**
   - Determine how customer was added to lists
   - Check for any data import or sync issues
   - Review consent collection processes

2. **Prevent recurrence**
   - Fix any identified issues
   - Update processes if needed
   - Provide additional training if human error was involved

### Recovery

1. **Monitor for similar complaints**
   - Watch for any additional related complaints
   - Check if issue affects other customers

2. **Post-incident review**
   - Document root cause
   - Identify improvements to prevent recurrence
   - Update this runbook if needed

## System Performance Degradation

### Detection

- Health check shows increased response times
- Alert from health_watch workflow
- Customer reports of slow service
- Monitoring shows high CPU or memory usage

### Immediate Actions

1. **Acknowledge the alert**
   - Post in team communication channel
   - Assign incident commander

2. **Assess system health**
   - Check resource utilization (CPU, memory, disk)
   - Review application logs for errors
   - Identify which services are affected

3. **Implement mitigation**
   - Scale up affected services if possible
   - Temporarily disable non-critical features
   - Implement request queuing if system is overwhelmed

### Communication

1. **Internal**
   - Post status updates every 30 minutes in team channel
   - Document all actions taken in incident log

2. **External**
   - If significant impact, notify merchants
   - Update status page if applicable

### Recovery

1. **Monitor for improvement**
   - Watch system metrics for stabilization
   - Gradually restore disabled features

2. **Scale back**
   - Return to normal resource allocation
   - Confirm all services are operating normally

3. **Post-incident review**
   - Document root cause
   - Identify improvements to prevent recurrence
   - Update this runbook if needed