import { useSwipeable } from 'react-swipeable';
import { useNavigate, useLocation } from 'react-router-dom';

// Navigation paths in order for swipe navigation
const SWIPE_ROUTES = [
  '/dashboard',
  '/dashboard/license',
  '/training',
  '/marketplace',
  '/dashboard/history',
];

export const useSwipeNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentIndex = SWIPE_ROUTES.findIndex(route => location.pathname === route);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex >= 0 && currentIndex < SWIPE_ROUTES.length - 1) {
        navigate(SWIPE_ROUTES[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        navigate(SWIPE_ROUTES[currentIndex - 1]);
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
    trackTouch: true,
    delta: 50,
    swipeDuration: 500,
  });

  return {
    handlers,
    currentIndex,
    totalRoutes: SWIPE_ROUTES.length,
    canSwipeLeft: currentIndex >= 0 && currentIndex < SWIPE_ROUTES.length - 1,
    canSwipeRight: currentIndex > 0,
  };
};

const SwipeNavigationWrapper = ({ children }) => {
  const { handlers } = useSwipeNavigation();

  return (
    <div {...handlers} className="min-h-screen">
      {children}
    </div>
  );
};

export default SwipeNavigationWrapper;
