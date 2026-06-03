# Feature Ticket List

Below is the Jira-style backlog of upcoming features and technical debt to be addressed in upcoming sprints.

| Ticket ID | Type | Title | Description | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NL-01** | Feature | **Apple Health / Google Fit Sync** | Integrate `@react-native-community/health` to sync logged calories and macros directly to native health apps. | High | To Do |
| **NL-02** | Feature | **Barcode Scanner Integration** | Add a standard barcode scanning mode to the camera UI to query the OpenFoodFacts API for packaged goods. | High | To Do |
| **NL-03** | Enhancement | **Offline Queueing** | Implement SQLite or AsyncStorage queue for food logs created while offline, syncing to Supabase when connection restores. | Medium | To Do |
| **NL-04** | Feature | **Water Tracking** | Add a simple daily water intake tracker (glasses/ml) to the main dashboard. | Medium | To Do |
| **NL-05** | Tech Debt | **End-to-End Tests** | Set up Detox or Maestro to run end-to-end UI tests for the core login and scanning flows. | Medium | To Do |
| **NL-06** | Feature | **Custom Recipes** | Allow users to save a group of scanned items as a "Recipe" or "Meal" for quick 1-tap logging in the future. | Low | To Do |
| **NL-07** | Bug | **Android Keyboard Padding** | Investigate a minor issue where `KeyboardAvoidingView` pushes the login button slightly too high on certain older Android devices. | Low | To Do |
| **NL-08** | Feature | **Push Notifications** | Integrate Expo Push Notifications to remind users to log their lunch/dinner if no activity is detected by 2 PM / 8 PM. | Low | To Do |
