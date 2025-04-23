import React from "react";

const phases = [{ title: "Session 1" }];

const WorkoutPlan = ({ client_id }: { client_id: string }) => {
  console.log("WorkoutPlan", client_id);

  return (
    <div className="w-full h-40">
      {/* TODO: Implement Workout Plan for client {client_id} */}
      {/* 
        Phases
            Sessions
                Exercises
      */}
      {phases.map((phase, index) => (
        <div key={index}>
          <p>{phase.title}</p>
        </div>
      ))}
    </div>
  );
};

export default WorkoutPlan;
