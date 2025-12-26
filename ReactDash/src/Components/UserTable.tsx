import React from "react";

interface User {
  user_id: number;
  name: string;
  password: string;
  role: string;
}

interface UserTableProps {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  loading,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (users.length === 0) {
    return <div className="text-center py-8 text-gray-500">No users found</div>;
  }

  return (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-300 px-4 py-2">ID</th>
          <th className="border border-gray-300 px-4 py-2">Name</th>
          <th className="border border-gray-300 px-4 py-2">Role</th>
          <th className="border border-gray-300 px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.user_id}>
            <td className="border border-gray-300 px-4 py-2">{user.user_id}</td>
            <td className="border border-gray-300 px-4 py-2">{user.name}</td>
            <td className="border border-gray-300 px-4 py-2">{user.role}</td>
            <td className="border border-gray-300 px-4 py-2">
              <button
                onClick={() => onEdit(user)}
                className="text-blue-600 hover:underline mr-4"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(user)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UserTable;
