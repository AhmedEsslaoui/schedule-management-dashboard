import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { collection, addDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Employee {
  id: string;
  fullName: string;
  email: string;
  country: string;
}

const countries = ['Egypt', 'Morocco', 'Africa'];

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    email: '',
    country: '',
  });

  useEffect(() => {
    // Subscribe to employees collection
    const unsubscribe = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const employeeData: Employee[] = [];
      snapshot.forEach((doc) => {
        employeeData.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(employeeData);
    });

    return () => unsubscribe();
  }, []);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNewEmployee({ fullName: '', email: '', country: '' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEmployee((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddEmployee = async () => {
    try {
      if (!newEmployee.fullName || !newEmployee.email || !newEmployee.country) {
        alert('Please fill in all fields');
        return;
      }
      
      await addDoc(collection(db, 'employees'), newEmployee);
      handleClose();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert('Error adding employee. Please try again.');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Error deleting employee. Please try again.');
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Employee Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleClickOpen}
        >
          Add Employee
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Full Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Country</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>{employee.fullName}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.country}</TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={() => handleDeleteEmployee(employee.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No employees found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Employee</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="fullName"
            label="Full Name"
            type="text"
            fullWidth
            value={newEmployee.fullName}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            value={newEmployee.email}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="country"
            label="Country"
            select
            fullWidth
            value={newEmployee.country}
            onChange={handleInputChange}
          >
            {countries.map((country) => (
              <MenuItem key={country} value={country}>
                {country}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleAddEmployee}
            variant="contained"
            disabled={!newEmployee.fullName || !newEmployee.email || !newEmployee.country}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
