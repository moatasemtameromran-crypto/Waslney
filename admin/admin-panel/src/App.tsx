import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { isLoggedIn } from "@/lib/api";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import { Customers, Drivers } from "@/pages/Users";
import Trips from "@/pages/Trips";
import Analytics from "@/pages/Analytics";
import Promotions from "@/pages/Promotions";
import Settings from "@/pages/Settings";
import { Holidays, VehicleTypes, Cancellation, DeleteRequests } from "@/pages/SimplePages";
import { ShuttleStops, ShuttleRoutes, ShuttleVehicles, ShuttleFare, ShuttleTrips, ShuttlePass } from "@/pages/ShuttlePages";
import { SuggestedRoutes, DriverDocuments, Cities, Homescreen, Pushes } from "@/pages/MorePages";
import { NewAccount, DriverReview, ManageBookings, Tenders, CreateTrip } from "@/pages/WaslneyTabs";

function NotFound() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="text-center">
        <div className="text-4xl font-bold text-foreground mb-2">404</div>
        <p>Page not found</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      {/* Shuttle */}
      <Route path="/shuttle/stops" component={ShuttleStops} />
      <Route path="/shuttle/routes" component={ShuttleRoutes} />
      <Route path="/shuttle/vehicles" component={ShuttleVehicles} />
      <Route path="/shuttle/fare" component={ShuttleFare} />
      <Route path="/shuttle/trips" component={ShuttleTrips} />
      <Route path="/shuttle/passes" component={ShuttlePass} />
      {/* Users */}
      <Route path="/customers" component={Customers} />
      <Route path="/drivers" component={Drivers} />
      <Route path="/trips" component={Trips} />
      {/* Waslney operations */}
      <Route path="/create-trip" component={CreateTrip} />
      <Route path="/tenders" component={Tenders} />
      <Route path="/review" component={DriverReview} />
      <Route path="/new-account" component={NewAccount} />
      <Route path="/manage-bookings" component={ManageBookings} />
      <Route path="/delete-requests" component={DeleteRequests} />
      <Route path="/driver-documents" component={DriverDocuments} />
      {/* Operations */}
      <Route path="/analytics" component={Analytics} />
      <Route path="/promotions" component={Promotions} />
      <Route path="/suggested-routes" component={SuggestedRoutes} />
      <Route path="/holidays" component={Holidays} />
      <Route path="/vehicle-types" component={VehicleTypes} />
      <Route path="/cancellation" component={Cancellation} />
      <Route path="/cities" component={Cities} />
      <Route path="/homescreen" component={Homescreen} />
      <Route path="/pushes" component={Pushes} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Layout>
        <Router />
      </Layout>
    </WouterRouter>
  );
}
