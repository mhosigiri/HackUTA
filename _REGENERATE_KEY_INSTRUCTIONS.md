## Instructions to Regenerate and Replace GCP Service Account Key

This guide will walk you through creating a new key for your Google Cloud service account and replacing the old one. This is the most likely solution to the persistent `Invalid JWT Signature` error.

**Estimated Time:** 5 minutes

---

### Step 1: Navigate to the Service Accounts Page in GCP

1.  Open the Google Cloud Console: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  Make sure you have the correct project selected. Your project ID is `docuextractmhosigiri`.
3.  In the navigation menu (☰), go to **IAM & Admin** > **Service Accounts**.

    *Direct Link:* [https://console.cloud.google.com/iam-admin/serviceaccounts?project=docuextractmhosigiri](https://console.cloud.google.com/iam-admin/serviceaccounts?project=docuextractmhosigiri)

### Step 2: Locate Your Service Account

1.  On the Service Accounts page, you will see a list of accounts.
2.  Find the service account with the following email:
    `mortgage-app-sa@docuextractmhosigiri.iam.gserviceaccount.com`

### Step 3: Create a New JSON Key

1.  Click on the email of the service account to go to its details page.
2.  Click on the **KEYS** tab near the top of the page.
3.  Click the **ADD KEY** button, then select **Create new key**.
4.  In the popup, ensure the key type is set to **JSON** (this is the default).
5.  Click **CREATE**.
6.  A new JSON key file will be automatically downloaded to your computer. It will have a long, unique name.

### Step 4: Replace the Old Key File

1.  Go to your project directory in Finder: `/Users/arniskc/Desktop/HackUTA/`
2.  You will see the old key file named `docuextractmhosigiri_servicekey.json`. **Delete this file.**
3.  Find the new key file you just downloaded (it's likely in your `Downloads` folder).
4.  Move the new key file into your project directory `/Users/arniskc/Desktop/HackUTA/`.
5.  **Crucially, rename the new key file to exactly `docuextractmhosigiri_servicekey.json`**. This must match the name referenced in your `.env` file.

---

### Step 5: Let Me Know You're Done

Once you have replaced and renamed the key file, simply reply with "**done**".

I will then perform a final restart of all services. With a fresh key, the authentication should succeed.
