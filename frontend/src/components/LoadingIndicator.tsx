

const LoadingIndicator = () => {
    return (
        <div className="flex justify-center items-center">
            <img 
                src="/lightmodelogo.png" 
                alt="Loading..." 
                className="w-10 h-10 animate-flip-vertical dark:hidden"
            />
            <img 
                src="/darkmodelogo.png" 
                alt="Loading..." 
                className="w-10 h-10 animate-flip-vertical hidden dark:block"
            />
        </div>
    );
};

export default LoadingIndicator;