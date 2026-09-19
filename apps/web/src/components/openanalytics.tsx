'use client';

import Script from 'next/script';

export function OpenAnalytics() {
  return (
    <Script
      data-collector="https://analytics-c.mirac.dev"
      data-domain="https://phase.sh"
      data-key="oa_pk_9dzAccDRZFgWOaWLKwb7OxnQJ8LkIo78"
      data-redact-query-keys="q,query,search,name,first_name,last_name,username,user,user_id,userid,address,message,callbackurl,redirect,redirect_uri,returnurl,app,appid,app_id,event,eventid,event_id,session,sessionid,session_id,device,deviceid,device_id,propertysearch,filter,filters,sql,link,linkid,link_id,funnel,funnelid,funnel_id"
      data-require-consent="false"
      data-respect-dnt="false"
      data-respect-gpc="false"
      id="openanalytics-script"
      src="/openanalytics-v0.8.0.js"
      strategy="afterInteractive"
    />
  );
}
