"use client";
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Create the User Context
const StoreContext = createContext();

// Create a provider component
export const StoreProvider = ({ children }) => {
  const [users, setUsers] = useState([]); // State to hold user data
  const [exercises, setExercises] = useState([]);
  const [trainers, setTrainers] = useState([]);

  const fetchUsers = async () => {
    const response = await axios.get(
      `${API_BASE_URL}/mvmt/v1/trainer/clients?lastId=&limit=50`,
      {
        withCredentials: true, // Include cookies in the request
      }
    );
    setUsers(response.data);
  };

  const fetchExercises = async () => {
    const response = await axios.get(
      `${API_BASE_URL}/mvmt/v1/admin/exercises`,
      {
        withCredentials: true,
      }
    );
    setExercises(response.data);
  };

  const fetchTrainers = async () => {
    const response = await axios.get(
      `${API_BASE_URL}/mvmt/v1/admin/trainerIds`,
      {
        withCredentials: true, // Include cookies in the request
      }
    );
    setTrainers(response.data);
  };

  useEffect(() => {
    fetchUsers();
    fetchExercises();
    fetchTrainers();
  }, []);

  return (
    <StoreContext.Provider value={{ users, exercises, trainers }}>
      {children}
    </StoreContext.Provider>
  );
};

// Custom hook to use the User Context
export const useStore = () => useContext(StoreContext);
