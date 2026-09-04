import axios from "axios";
import { API } from "../types";

const getAuthHeaders = () => {
  const userStr = localStorage.getItem("user");
  let token = localStorage.getItem("auth_token") || localStorage.getItem("token");
  if (!token && userStr) {
    try {
      const userObj = JSON.parse(userStr);
      token = userObj.token;
    } catch (e) {}
  }
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const getPlans = async () => {
  const response = await axios.get(`${API}/pricing/plans`);
  return response.data;
};

export const getCreditPackages = async () => {
  const response = await axios.get(`${API}/pricing/packages`);
  return response.data;
};

export const getSubscriptionDetails = async () => {
  const response = await axios.get(`${API}/subscription`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const purchasePlan = async (planId, billingCycle) => {
  const response = await axios.post(
    `${API}/subscription/purchase`,
    { planId, billingCycle },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const buyCredits = async (packageId) => {
  const response = await axios.post(
    `${API}/subscription/buy-credits`,
    { packageId },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const createSubscriptionOrder = async (orderData) => {
  const response = await axios.post(
    `${API}/subscription/create-order`,
    orderData,
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const getCreditHistory = async () => {
  const response = await axios.get(apis.subscription.history, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
