import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../../FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import Breadcrumb from "../../components/Breadcrumbs/Breadcrumb";
import { FaMapMarkerAlt, FaUser, FaTruck, FaShoppingCart, FaEuroSign, FaClock } from "react-icons/fa";
import DeliveryTracking from "../Command/DeliveryTracking";

interface CommandDetails {
  id: string;
  user: string;
  userName: string;
  address: {
    address: string;
    title: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  products: { productRef: string; productName: string; quantity: number; price: number }[];
  status: string;
  totalAmount: number;
  datePassCommande: string;
  dateShippingStart?: string;
  dateFinish?: string;
  deliveryMan?: { name: string; photo: string; location?: { latitude: number; longitude: number } };
  deliveryTime?: string | null;
}

const CommandDetail: React.FC = () => {
  const { id } = useParams();
  const [command, setCommand] = useState<CommandDetails | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const fetchCommand = async () => {
      try {
        const commandRef = doc(db, "Commande", id || "");
        const commandSnap = await getDoc(commandRef);

        if (commandSnap.exists()) {
          const data = commandSnap.data();

          // Fetch User Details
          const userSnap = data.user ? await getDoc(doc(db, data.user.path)) : null;
          const userName = userSnap?.exists() ? userSnap.data()?.firstName || "Unnamed User" : "Unknown User";

          // Fetch Delivery Man Details (Including Live Location)
          let deliveryMan = undefined;
          if (data.DelivaryMan) {
            const deliveryManSnap = await getDoc(doc(db, data.DelivaryMan.path));
            if (deliveryManSnap.exists()) {
              deliveryMan = {
                name: deliveryManSnap.data()?.firstName || "Unknown Delivery Man",
                photo: deliveryManSnap.data()?.photo_url || "/placeholder-avatar.png",
                location: deliveryManSnap.data()?.location || undefined,
              };
            }
          }

          // Fetch Product Details
          const products = await Promise.all(
            data.Products.map(async (product: any) => {
              const productSnap = await getDoc(doc(db, product.Product.path));
              const productName = productSnap?.exists() ? productSnap.data()?.name || "Unnamed Product" : "Unknown Product";
              return {
                productRef: product.Product.path,
                productName,
                quantity: product.Quantity,
                price: product.Price,
              };
            })
          );

          // Calculate Delivery Time
          let deliveryTime: string | null = null;
          if (data.DateShippingStart && data.DateFinish) {
            const start = new Date(data.DateShippingStart.seconds * 1000);
            const finish = new Date(data.DateFinish.seconds * 1000);
            const duration = Math.abs(finish.getTime() - start.getTime());
            const hours = Math.floor(duration / (1000 * 60 * 60));
            const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
            deliveryTime = `${hours}h ${minutes}m`;
          }

          setCommand({
            id: commandSnap.id,
            user: data.user.path,
            userName,
            address: {
              address: data.addresse?.address || "No Address",
              title: data.addresse?.title || "Unknown Title",
              location: {
                latitude: data.addresse?.location?.latitude || 0,
                longitude: data.addresse?.location?.longitude || 0,
              },
            },
            products,
            status: data.Status || "Pending",
            totalAmount: data.TotalAmount || 0,
            datePassCommande: new Date(data.DatePAssCommande?.seconds * 1000).toLocaleString(),
            dateShippingStart: data.DateShippingStart
              ? new Date(data.DateShippingStart.seconds * 1000).toLocaleString()
              : undefined,
            dateFinish: data.DateFinish
              ? new Date(data.DateFinish.seconds * 1000).toLocaleString()
              : undefined,
            deliveryMan,
            deliveryTime,
          });
        }
      } catch (error) {
        console.error("Error fetching command details:", error);
      }
    };

    fetchCommand();
  }, [id]);

  if (!command) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
      <Breadcrumb pageName={`Command Details`} />
  
      {/* General Info, Timeline & Delivery Man Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* General Information */}
        <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">General Information</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            <FaUser className="inline-block mr-2" /> User: {command.userName}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            <FaMapMarkerAlt className="inline-block mr-2" /> Address: {command.address.address} ({command.address.title})
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Latitude: {command.address.location.latitude}, Longitude: {command.address.location.longitude}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            <FaEuroSign className="inline-block mr-2" /> Total Amount: €{command.totalAmount.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Status:{" "}
            <span className={`${
              command.status === "Finished" ? "text-green-600" : 
              command.status === "Delivering" ? "text-blue-500" : 
              "text-yellow-500"
            }`}>
              {command.status}
            </span>
          </p>
        </div>
  
        {/* Timeline */}
        <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Timeline</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            <FaShoppingCart className="inline-block mr-2" /> Order Placed: {command.datePassCommande}
          </p>
          {command.dateShippingStart && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Shipping Started: {command.dateShippingStart}
            </p>
          )}
          {command.dateFinish && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Finished: {command.dateFinish}
            </p>
          )}
          {command.deliveryTime && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              <FaClock className="inline-block mr-2" /> Delivery Time: {command.deliveryTime}
            </p>
          )}
        </div>
  
        {/* Delivery Man Responsible */}
        {command.deliveryMan && (
          <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-md shadow flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Delivery Responsible</h2>
            <img
              src={command.deliveryMan.photo}
              alt={command.deliveryMan.name}
              className="w-20 h-20 rounded-full object-cover shadow mb-3"
            />
            <p className="text-sm text-gray-600 dark:text-gray-300 font-semibold">{command.deliveryMan.name}</p>
            {command.deliveryMan.location && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <FaTruck className="inline-block mr-1" /> Started from: 
                <br />Lat: {command.deliveryMan.location.latitude}, Lng: {command.deliveryMan.location.longitude}
              </p>
            )}
          </div>
        )}
      </div>
  
      {/* Track Delivery Button */}
      {command.deliveryMan?.location && (
        <div className="text-center mt-6">
          <button 
            onClick={() => setShowMap(true)}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Track Delivery
          </button>
        </div>
      )}
  
      {/* Show Google Maps when clicked */}
      {showMap && command.deliveryMan?.location && (
  <div className="mt-6">
    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Delivery Route</h2>
    <DeliveryTracking 
      clientLocation={{
        lat: command.address.location.latitude,
        lng: command.address.location.longitude
      }} 
      deliveryStartLocation={{
        lat: command.deliveryMan.location.latitude,
        lng: command.deliveryMan.location.longitude
      }} 
    />
  </div>
)}

  
      {/* Products Section */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Ordered Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-600 text-left">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-white">Product</th>
                <th className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-white">Quantity</th>
                <th className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-white">Price (€)</th>
                <th className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-white">Subtotal (€)</th>
              </tr>
            </thead>
            <tbody>
              {command.products.map((product, index) => (
                <tr key={index} className="border-b dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <td className="px-4 py-2">{product.productName}</td>
                  <td className="px-4 py-2">{product.quantity}</td>
                  <td className="px-4 py-2">€{product.price.toFixed(2)}</td>
                  <td className="px-4 py-2">€{(product.price * product.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
  
      {/* Total Amount */}
      <div className="mt-4 text-right pr-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Total: €{command.totalAmount.toFixed(2)}
        </h3>
      </div>
    </div>
  );
  
};

export default CommandDetail;
