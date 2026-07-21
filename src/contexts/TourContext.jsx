import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Joyride, { STATUS } from 'react-joyride';

const TourContext = createContext(null);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

export function TourProvider({ children }) {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);

  const startTour = useCallback((newSteps) => {
    setSteps(newSteps);
    setRun(true);
  }, []);

  const handleJoyrideCallback = useCallback((data) => {
    console.log('Joyride callback:', data);
    const { status, type, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      console.log('Tour finalizado o saltado. Estado:', status);
      setRun(false);
    }
  }, []);

  return (
    <TourContext.Provider value={{ startTour, run, setRun }}>
      <Joyride
        callback={handleJoyrideCallback}
        continuous={true}
        run={run}
        scrollToFirstStep={true}
        showProgress={true}
        showSkipButton={true}
        steps={steps}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#007bff', // Adjust based on your theme
          },
        }}
      />
      {children}
    </TourContext.Provider>
  );
}
